import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';
import { v4 as uuidv4 } from 'uuid';

jest.mock('uuid', () => ({ v4: jest.fn() }));

describe('HttpExceptionFilter', () => {
  const createHost = (responseMock: any): ArgumentsHost => {
    return {
      switchToHttp: () => ({
        getResponse: () => responseMock,
      }),
    } as ArgumentsHost;
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes simple HttpException payloads with traceId', () => {
    (uuidv4 as jest.Mock).mockReturnValue('trace-simple');
    const filter = new HttpExceptionFilter();
    const responseMock = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const host = createHost(responseMock);
    const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

    filter.catch(exception, host);

    expect(responseMock.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(responseMock.json).toHaveBeenCalledWith({
      code: 'HTTP_403',
      message: 'Forbidden',
      traceId: 'trace-simple',
    });
  });

  it('prioritizes custom code, message array and details', () => {
    (uuidv4 as jest.Mock).mockReturnValue('trace-custom');
    const filter = new HttpExceptionFilter();
    const responseMock = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const host = createHost(responseMock);

    const exception = new HttpException(
      {
        code: 'REFUND_WINDOW_EXCEEDED',
        message: ['Too late', 'Window closed'],
        details: { windowDays: 7 },
      },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, host);

    expect(responseMock.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(responseMock.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'REFUND_WINDOW_EXCEEDED',
        message: 'Too late; Window closed',
        traceId: 'trace-custom',
        details: expect.stringContaining('&quot;windowDays&quot;:7'),
      }),
    );
  });
});
