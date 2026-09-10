const jwt = require('jsonwebtoken');

// Mock modules
jest.mock('../src/config/database', () => ({
  user: {
    findUnique: jest.fn(),
  },
}));

const prisma = require('../src/config/database');
const { generateToken, verifyToken, authenticate, authorize } = require('../src/middleware/auth');

const JWT_SECRET = 'dev-secret-change-me';

describe('Auth Middleware', () => {
  // ─── Token generation / verification ─────────────────────────────────────────

  test('generateToken creates a valid JWT', () => {
    const user = { id: 'user-1', role: 'DONOR', phone: '+919000000001' };
    const token = generateToken(user);
    expect(token).toBeDefined();
    const decoded = jwt.verify(token, JWT_SECRET);
    expect(decoded.userId).toBe('user-1');
    expect(decoded.role).toBe('DONOR');
  });

  test('verifyToken decodes a valid JWT', () => {
    const token = jwt.sign({ userId: 'u1', role: 'ADMIN' }, JWT_SECRET, { expiresIn: '1h' });
    const decoded = verifyToken(token);
    expect(decoded.userId).toBe('u1');
  });

  test('verifyToken throws on expired token', () => {
    const token = jwt.sign({ userId: 'u1' }, JWT_SECRET, { expiresIn: '-1s' });
    expect(() => verifyToken(token)).toThrow();
  });

  test('verifyToken throws on invalid token', () => {
    expect(() => verifyToken('invalid.token.here')).toThrow();
  });

  // ─── authenticate middleware ─────────────────────────────────────────────────

  test('authenticate rejects request without Authorization header', async () => {
    const req = { headers: {} };
    const res = {};
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401 })
    );
  });

  test('authenticate rejects malformed Bearer token', async () => {
    const req = { headers: { authorization: 'Basic abc' } };
    const next = jest.fn();

    await authenticate(req, {}, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401 })
    );
  });

  test('authenticate passes valid token and attaches user', async () => {
    const mockUser = { id: 'u1', role: 'DONOR', accountStatus: 'ACTIVE', donorProfile: null, hospital: null, bloodBank: null, ngo: null };
    prisma.user.findUnique.mockResolvedValue(mockUser);

    const token = generateToken(mockUser);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const next = jest.fn();

    await authenticate(req, {}, next);

    expect(next).toHaveBeenCalledWith(); // called with no error
    expect(req.user).toEqual(mockUser);
  });

  test('authenticate rejects INACTIVE user', async () => {
    const mockUser = { id: 'u2', role: 'DONOR', accountStatus: 'INACTIVE' };
    prisma.user.findUnique.mockResolvedValue(mockUser);

    const token = generateToken(mockUser);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const next = jest.fn();

    await authenticate(req, {}, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403 })
    );
  });

  // ─── authorize middleware ────────────────────────────────────────────────────

  test('authorize allows user with correct role', () => {
    const middleware = authorize('DONOR', 'ADMIN');
    const req = { user: { role: 'DONOR' } };
    const next = jest.fn();

    middleware(req, {}, next);

    expect(next).toHaveBeenCalledWith(); // no error
  });

  test('authorize rejects user with wrong role', () => {
    const middleware = authorize('ADMIN');
    const req = { user: { role: 'DONOR' } };
    const next = jest.fn();

    middleware(req, {}, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403 })
    );
  });

  test('authorize rejects unauthenticated request', () => {
    const middleware = authorize('ADMIN');
    const req = {};
    const next = jest.fn();

    middleware(req, {}, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401 })
    );
  });
});
