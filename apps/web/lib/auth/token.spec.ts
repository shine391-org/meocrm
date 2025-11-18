import { getBrowserToken } from './token';

describe('getBrowserToken', () => {
  afterEach(() => {
    // @ts-expect-error test cleanup
    delete window.sessionStorage;
  });

  it('returns null when sessionStorage returns null', () => {
    const getItem = jest.fn().mockReturnValue(null);
    mockSessionStorage(getItem);
    expect(getBrowserToken()).toBeNull();
  });

  it('returns null when stored token is falsy or invalid', () => {
    const getItem = jest.fn().mockReturnValue('null');
    mockSessionStorage(getItem);
    expect(getBrowserToken()).toBeNull();
  });

  it('returns token string when present', () => {
    const getItem = jest.fn().mockReturnValue('valid-token');
    mockSessionStorage(getItem);
    expect(getBrowserToken()).toBe('valid-token');
  });
});

function mockSessionStorage(getItem: jest.Mock) {
  Object.defineProperty(window, 'sessionStorage', {
    configurable: true,
    value: {
      getItem,
    },
  });
}
