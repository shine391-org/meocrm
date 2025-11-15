import { ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';
import { v4 as uuidv4 } from 'uuid';
import { RequestContextService } from '../context/request-context.service';

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

  const createFilter = (traceId?: string) => {
    const requestContextService = {
      getTraceId: jest.fn().mockReturnValue(traceId),
    } as unknown as RequestContextService;
    return new HttpExceptionFilter(requestContextService);
  };

  it('normalizes simple HttpException payloads with traceId', () => {
    (uuidv4 as jest.Mock).mockReturnValue('trace-simple');
    const filter = createFilter();
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
    const filter = createFilter();
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

  it('returns stable fallback when details contain circular references', () => {
    (uuidv4 as jest.Mock).mockReturnValue('trace-circular');
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const filter = createFilter();
    const responseMock = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const host = createHost(responseMock);

    const circular: Record<string, unknown> = { foo: 'bar' };
    circular.self = circular;

    const exception = new HttpException(
      {
        message: 'Bad payload',
        details: circular,
      },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, host);

    expect(responseMock.json).toHaveBeenCalledWith(
      expect.objectContaining({
        details: '[unserializable details]',
        traceId: 'trace-circular',
      }),
    );
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
