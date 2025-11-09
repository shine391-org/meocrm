import { getBrowserToken } from './token';

describe('getBrowserToken', () => {
  afterEach(() => {
    // @ts-expect-error cleanup for test environment
    delete global.localStorage;
  });

  it('returns null when storage is unavailable', () => {
    expect(getBrowserToken()).toBeNull();
  });

  it('returns null when stored token is falsy or invalid', () => {
    const getItem = jest.fn().mockReturnValue('null');
    // @ts-expect-error partial storage mock
    global.localStorage = { getItem };
    expect(getBrowserToken()).toBeNull();
  });

  it('returns token string when present', () => {
    const getItem = jest.fn().mockReturnValue('valid-token');
    // @ts-expect-error partial storage mock
    global.localStorage = { getItem };
    expect(getBrowserToken()).toBe('valid-token');
  });
});
