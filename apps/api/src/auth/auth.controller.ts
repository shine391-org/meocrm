/* istanbul ignore file */
import { Controller, Post, Get, Body, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { Request, Response } from 'express';

const REFRESH_TOKEN_COOKIE = 'meocrm_refresh_token';
const REFRESH_TOKEN_DEFAULT_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto);
    this.setRefreshTokenCookie(res, result.refreshToken, result.refreshTokenMaxAgeMs);
    return result;
  }

  @Post('login')
  @Public()
  @ApiOperation({ summary: 'Login and get tokens' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    this.setRefreshTokenCookie(res, result.refreshToken, result.refreshTokenMaxAgeMs);
    return result;
  }

  @Post('refresh')
  @Public()
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = this.extractRefreshToken(req);
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }
    const result = await this.authService.refreshAccessToken(refreshToken);
    this.setRefreshTokenCookie(res, result.refreshToken, result.refreshTokenMaxAgeMs);
    return result;
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @ApiResponse({ status: 200, description: 'Logged out' })
  async logout(
    @CurrentUser() user: any,
    @Req() req: Request,
    @Body('refreshToken') refreshToken: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = refreshToken ?? this.extractRefreshToken(req);
    if (!token) {
      throw new UnauthorizedException('Refresh token missing');
    }
    const result = await this.authService.logout(user.id, token);
    this.clearRefreshTokenCookie(res);
    return result;
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user info' })
  @ApiResponse({ status: 200, description: 'User info retrieved' })
  async getCurrentUser(@CurrentUser() user: any) {
    return this.authService.getCurrentUser(user.id);
  }

  private setRefreshTokenCookie(res: Response, token: string, maxAge = REFRESH_TOKEN_DEFAULT_MAX_AGE) {
    res.cookie(REFRESH_TOKEN_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.isSecureCookie(),
      maxAge,
      path: '/',
      signed: true,
    });
  }

  private clearRefreshTokenCookie(res: Response) {
    res.cookie(REFRESH_TOKEN_COOKIE, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.isSecureCookie(),
      expires: new Date(0),
      path: '/',
      signed: true,
    });
  }

  private extractRefreshToken(req: Request): string | null {
    return req.signedCookies?.[REFRESH_TOKEN_COOKIE] || null;
  }

  private isSecureCookie(): boolean {
    const env = (process.env.NODE_ENV ?? 'development').toLowerCase();
    return env === 'production';
  }
}
