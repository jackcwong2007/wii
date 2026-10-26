const crypto = require('crypto');
const os = require('os');

function configuredSubdomain() {
  const supplied = process.env.WII_TUNNEL_SUBDOMAIN?.trim().toLowerCase();
  if (supplied) {
    if (!/^[a-z0-9-]{4,63}$/.test(supplied)) {
      throw new Error('WII_TUNNEL_SUBDOMAIN must contain 4–63 lowercase letters, numbers, or hyphens.');
    }
    return supplied;
  }

  // Stable on this computer, opaque to other LocalTunnel users, and very unlikely
  // to collide. Set WII_TUNNEL_SUBDOMAIN yourself if you prefer a memorable name.
  const identity = `${os.hostname()}|${process.env.USERNAME || 'local-user'}|${__dirname}`;
  const suffix = crypto.createHash('sha256').update(identity).digest('hex').slice(0, 12);
  return `wii-cursor-${suffix}`;
}

function tunnelConfig(port) {
  const subdomain = configuredSubdomain();
  return {
    options: { port, subdomain },
    subdomain,
  };
}

function assignedPhoneUrl(tunnelUrl) {
  const url = new URL(tunnelUrl);
  return `${url.origin}/phone/`;
}

function hasRequestedSubdomain(tunnelUrl, subdomain) {
  return new URL(tunnelUrl).hostname.split('.')[0] === subdomain;
}

module.exports = { tunnelConfig, assignedPhoneUrl, hasRequestedSubdomain };
