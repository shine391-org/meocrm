/* istanbul ignore file */
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'MeoCRM API v1.0 - Multi-tenant CRM System 🚀';
  }
}
