import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './strategies/jwt.strategy';

type JwtDuration = `${number}d` | `${number}h` | `${number}m`;

interface TokenOptions {
  remember?: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const organizationCode = dto.organizationCode.trim().toUpperCase();
    const organization = await this.prisma.organization.findUnique({
      where: { code: organizationCode },
    });

    if (!organization) {
      throw new UnauthorizedException('Invalid organization code');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        organizationId: organization.id,
        role: 'STAFF',
      },
      include: { organization: true },
    });

    const { accessToken, refreshToken, refreshTokenMaxAgeMs } = await this.generateTokens(user.id, user.email, user.organizationId);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organization: user.organization,
      },
      accessToken,
      refreshToken,
      refreshTokenMaxAgeMs,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { organization: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { accessToken, refreshToken, refreshTokenMaxAgeMs } = await this.generateTokens(user.id, user.email, user.organizationId, {
      remember: dto.remember ?? false,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organization: user.organization,
      },
      accessToken,
      refreshToken,
      refreshTokenMaxAgeMs,
    };
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      const refreshSecret = this.getSecretOrThrow('JWT_REFRESH_SECRET');
      this.jwtService.verify(refreshToken, {
        secret: refreshSecret,
      });

      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!storedToken || storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      const { accessToken, refreshToken: newRefreshToken, refreshTokenMaxAgeMs } = await this.generateTokens(
        storedToken.user.id,
        storedToken.user.email,
        storedToken.user.organizationId,
        { remember: storedToken.remember },
      );

      // Delete old refresh token
      await this.prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });

      return {
        accessToken,
        refreshToken: newRefreshToken,
        refreshTokenMaxAgeMs,
      };
    } catch (error) {
      this.logger.error('Refresh token validation failed', error instanceof Error ? error.stack : error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({
      where: {
        userId,
        token: refreshToken,
      },
    });

    return { message: 'Logged out successfully' };
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      organization: user.organization,
    };
  }

  private async generateTokens(userId: string, email: string, organizationId: string, options: TokenOptions = {}) {
    const payload: JwtPayload = {
      sub: userId,
      email,
      organizationId,
    };

    const accessSecret = this.getSecretOrThrow('JWT_SECRET');
    const refreshSecret = this.getSecretOrThrow('JWT_REFRESH_SECRET');
    const accessExpiresIn = (this.configService.get<string>('JWT_EXPIRES_IN') ?? '15m') as JwtDuration;
    const { duration: refreshExpiresIn, ttlMs: refreshTokenTtlMs } = this.getRefreshExpiry(options.remember ?? false);

    const accessToken = this.jwtService.sign(payload, {
      secret: accessSecret,
      expiresIn: accessExpiresIn,
    });

    // Add unique jti (JWT ID) to ensure each refresh token is unique
    const refreshTokenPayload = {
      ...payload,
      jti: `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
      remember: options.remember ?? false,
    };

    const refreshToken = this.jwtService.sign(refreshTokenPayload, {
      secret: refreshSecret,
      expiresIn: refreshExpiresIn,
    });

    // Delete existing refresh tokens for this user to prevent duplicates
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    // Store refresh token in database
    const expiresAt = new Date(Date.now() + refreshTokenTtlMs);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt,
        remember: options.remember ?? false,
      },
    });

    return { accessToken, refreshToken, refreshTokenMaxAgeMs: refreshTokenTtlMs };
  }

  private getSecretOrThrow(key: 'JWT_SECRET' | 'JWT_REFRESH_SECRET') {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(`${key} is not configured`);
    }
    return value;
  }

  private getRefreshExpiry(remember: boolean): { duration: JwtDuration; ttlMs: number } {
    if (remember) {
      const duration = (this.configService.get<string>('JWT_REFRESH_REMEMBER_EXPIRES_IN') ?? '30d') as JwtDuration;
      return { duration, ttlMs: this.durationToMs(duration) };
    }

    const duration = (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d') as JwtDuration;
    return { duration, ttlMs: this.durationToMs(duration) };
  }

  private durationToMs(duration: JwtDuration): number {
    const match = duration.match(/^(\d+)([dhm])$/);
    if (!match) {
      throw new Error(`Invalid JWT duration format: ${duration}`);
    }

    const value = Number(match[1]);
    const unit = match[2];
    const unitMap: Record<string, number> = {
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * unitMap[unit];
  }
}
