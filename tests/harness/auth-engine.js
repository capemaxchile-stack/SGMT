/**
 * Auth & RBAC Domain Engine (Opaque-Box Contract)
 * Verifies SEC-CREDS, SEC-JWT-SECRETS, SEC-AUTH-STATUS, SEC-RBAC-HARDEN, SEC-DTO-VALIDATE
 */

const crypto = require('crypto');

class AuthEngine {
  constructor(config = {}) {
    this.jwtSecret = config.jwtSecret || 'valid-test-access-secret-32-chars-long';
    this.jwtRefreshSecret = config.jwtRefreshSecret || 'valid-test-refresh-secret-32-chars-long';
    this.allowDefaultSecret = config.allowDefaultSecret !== undefined ? config.allowDefaultSecret : false;
    this.users = new Map();
    this.tokenBlacklist = new Set();
  }

  // Boot-time secret validation (SEC-JWT-SECRETS)
  static validateBootSecrets(env) {
    const jwtSecret = env.JWT_SECRET;
    const jwtRefreshSecret = env.JWT_REFRESH_SECRET;

    if (!jwtSecret || jwtSecret.trim() === '') {
      throw new Error('JWT_SECRET must be configured and non-empty');
    }
    if (jwtSecret === 'default_secret_key_change_me_in_prod') {
      throw new Error('Insecure default JWT_SECRET is prohibited');
    }
    if (!jwtRefreshSecret || jwtRefreshSecret.trim() === '') {
      throw new Error('JWT_REFRESH_SECRET must be configured and non-empty');
    }
    if (jwtSecret === jwtRefreshSecret) {
      throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be distinct secrets');
    }
    return true;
  }

  registerUser(userData) {
    const user = {
      id: userData.id || crypto.randomUUID(),
      email: userData.email,
      name: userData.name,
      rut: userData.rut || '12345678-9',
      passwordHash: userData.passwordHash || 'hashed_pwd_' + (userData.password || '123456'),
      superKeyHash: userData.superKeyHash || (userData.superKey ? 'hashed_sk_' + userData.superKey : null),
      isActive: userData.isActive !== undefined ? userData.isActive : true,
      roles: userData.roles || ['USER'],
      maxApprovalAmount: userData.maxApprovalAmount !== undefined ? userData.maxApprovalAmount : 0,
      createdAt: new Date().toISOString(),
    };
    this.users.set(user.id, user);
    return user;
  }

  // SEC-CREDS: Sanitize findAllActive to never expose passwordHash or superKeyHash
  findAllActive() {
    const activeUsers = [];
    for (const user of this.users.values()) {
      if (user.isActive) {
        // Must NEVER expose passwordHash or superKeyHash
        const { passwordHash, superKeyHash, ...summaryDto } = user;
        activeUsers.push(summaryDto);
      }
    }
    return activeUsers;
  }

  // SEC-AUTH-STATUS: Enforce isActive: true on login
  login(email, password) {
    let foundUser = null;
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === email.toLowerCase()) {
        foundUser = u;
        break;
      }
    }

    if (!foundUser) {
      throw new Error('Unauthorized: Invalid credentials');
    }

    // Verify password hash
    const expectedHash = 'hashed_pwd_' + password;
    if (foundUser.passwordHash !== expectedHash && foundUser.passwordHash !== password) {
      throw new Error('Unauthorized: Invalid credentials');
    }

    // Enforce isActive
    if (!foundUser.isActive) {
      throw new Error('Unauthorized: Account is inactive');
    }

    const payload = {
      sub: foundUser.id,
      email: foundUser.email,
      roles: foundUser.roles,
      type: 'access',
    };

    const accessToken = this.signToken(payload, this.jwtSecret, 900); // 15 mins
    const refreshToken = this.signToken({ sub: foundUser.id, type: 'refresh' }, this.jwtRefreshSecret, 604800); // 7 days

    const { passwordHash, superKeyHash, ...safeUser } = foundUser;
    return {
      accessToken,
      refreshToken,
      user: safeUser,
    };
  }

  // SEC-AUTH-STATUS & SEC-JWT-SECRETS: Token Refresh
  refreshToken(refreshTokenString) {
    if (!refreshTokenString || typeof refreshTokenString !== 'string') {
      throw new Error('Bad Request: refreshToken must be provided');
    }

    const payload = this.verifyToken(refreshTokenString, this.jwtRefreshSecret);
    if (!payload || payload.type !== 'refresh') {
      throw new Error('Unauthorized: Invalid refresh token');
    }

    const user = this.users.get(payload.sub);
    if (!user) {
      throw new Error('Unauthorized: User not found');
    }

    if (!user.isActive) {
      throw new Error('Unauthorized: Account is inactive');
    }

    const newAccessToken = this.signToken({
      sub: user.id,
      email: user.email,
      roles: user.roles,
      type: 'access',
    }, this.jwtSecret, 900);

    const newRefreshToken = this.signToken({
      sub: user.id,
      type: 'refresh',
    }, this.jwtRefreshSecret, 604800);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  // SEC-RBAC-HARDEN: Fail-closed RolesGuard check
  authorize(token, allowedRoles = [], endpointRequiresAuth = true) {
    if (!token && endpointRequiresAuth) {
      throw new Error('Unauthorized: Bearer token missing');
    }

    if (!token && !endpointRequiresAuth) {
      return true;
    }

    const payload = this.verifyToken(token, this.jwtSecret);
    if (!payload || payload.type !== 'access') {
      throw new Error('Unauthorized: Invalid or expired access token');
    }

    // Fail-closed: If allowedRoles is specified, user MUST have at least one allowed role
    if (allowedRoles && allowedRoles.length > 0) {
      const userRoles = payload.roles || [];
      const hasRole = userRoles.some(r => allowedRoles.includes(r));
      if (!hasRole) {
        throw new Error('Forbidden: Insufficient permissions');
      }
    }

    return payload;
  }

  // SEC-DTO-VALIDATE: Whitelist and forbidden non-whitelisted properties validation
  validateDto(payload, allowedFields, requiredFields = []) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('Bad Request: Payload must be a valid JSON object');
    }

    const payloadKeys = Object.keys(payload);
    for (const key of payloadKeys) {
      if (!allowedFields.includes(key)) {
        throw new Error(`Bad Request: Property "${key}" should not exist (non-whitelisted property)`);
      }
    }

    for (const req of requiredFields) {
      if (payload[req] === undefined || payload[req] === null || payload[req] === '') {
        throw new Error(`Bad Request: Required field "${req}" is missing or empty`);
      }
    }

    return true;
  }

  // Token helpers using HMAC-SHA256 simulation
  signToken(payload, secret, expiresInSeconds = 900) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const fullPayload = { ...payload, exp, iat: Math.floor(Date.now() / 1000) };

    const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
    const b64Payload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${b64Header}.${b64Payload}`)
      .digest('base64url');

    return `${b64Header}.${b64Payload}.${signature}`;
  }

  verifyToken(token, secret) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Malformed token');
      }
      const [b64Header, b64Payload, signature] = parts;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${b64Header}.${b64Payload}`)
        .digest('base64url');

      if (signature !== expectedSignature) {
        throw new Error('Invalid signature');
      }

      const payload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf8'));
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('Token expired');
      }

      return payload;
    } catch (err) {
      throw new Error('Token verification failed: ' + err.message);
    }
  }
}

module.exports = { AuthEngine };
