/**
 * Database Microservice Recognition & Connection Helper
 * Detects common databases (PostgreSQL, MySQL, Redis, MongoDB)
 * and formats standard connection strings for 1-click clipboard copy and client launch.
 */

export function extractPort(portsStr, defaultPort) {
  if (!portsStr) return defaultPort;
  const str = String(portsStr);
  const match = str.match(/:(\d+)(?:->|:|\/|$)/) || str.match(/^(\d+):/) || str.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : defaultPort;
}

function parseEnvValue(content, envKeys) {
  if (!content) return null;
  for (const key of envKeys) {
    // Matches: - KEY=val, KEY: val, KEY="val", KEY='val'
    const reg = new RegExp(`(?:^|\\s)(?:-\\s*)?${key}\\s*[:=]\\s*["']?([^\\s"'\n]+)["']?`, 'im');
    const m = content.match(reg);
    if (m && m[1]) {
      return m[1].trim();
    }
  }
  return null;
}

/**
 * Detects if a given service is a database, and generates its standard URI
 * @param {string} serviceName - e.g. 'student-db', 'mysql', 'redis'
 * @param {string|number} portsStr - port mapping string or number
 * @param {string} composeContent - raw compose YAML content (optional, for env extraction)
 * @param {string} [orbProjectName=''] - OrbStack project name for native domain resolution
 * @param {string} [imageName=''] - container image name e.g. 'postgres:15-alpine', 'mysql:8.0'
 * @returns {object} Database description object
 */
export function detectDatabaseService(serviceName = '', portsStr = '', composeContent = '', orbProjectName = '', imageName = '') {
  const nameLower = (serviceName || '').toLowerCase();
  const imageLower = (imageName || '').toLowerCase();
  const portsRawStr = String(portsStr || '');
  const portNum = extractPort(portsStr, 0);
  const cleanSvc = (serviceName || '').trim().toLowerCase();
  const cleanProj = (orbProjectName || '').trim().toLowerCase();
  const isInternal = portNum === 0;

  // Check if string contains specific internal or mapped port
  const hasPort = (targetPort) => portNum === targetPort || portsRawStr.includes(String(targetPort));

  // If container has no published host port, route via OrbStack native internal domain
  const host = (isInternal && cleanProj) ? `${cleanSvc}.${cleanProj}.orb.local` : 'localhost';
  const isOrbDirect = isInternal && Boolean(cleanProj);

  // 1. PostgreSQL
  if (
    nameLower.includes('postgres') ||
    nameLower.includes('pgsql') ||
    nameLower.includes('student-db') ||
    imageLower.includes('postgres') ||
    imageLower.includes('pgsql') ||
    hasPort(5432)
  ) {
    const port = portNum || 5432;
    const user = parseEnvValue(composeContent, ['POSTGRES_USER']) || 'postgres';
    const password = parseEnvValue(composeContent, ['POSTGRES_PASSWORD']) || 'postgres';
    const db = parseEnvValue(composeContent, ['POSTGRES_DB']) || 'postgres';
    const uri = `postgresql://${user}:${password}@${host}:${port}/${db}`;
    const jdbcUrl = `jdbc:postgresql://${host}:${port}/${db}`;

    return {
      isDb: true,
      type: 'postgres',
      label: 'PostgreSQL',
      icon: '🐘',
      port,
      user,
      password,
      database: db,
      uri,
      jdbcUrl,
      isOrbDirect,
      defaultClient: 'TablePlus / DBeaver'
    };
  }

  // 2. MySQL / MariaDB
  if (
    nameLower.includes('mysql') ||
    nameLower.includes('mariadb') ||
    imageLower.includes('mysql') ||
    imageLower.includes('mariadb') ||
    hasPort(3306)
  ) {
    const port = portNum || 3306;
    const user = parseEnvValue(composeContent, ['MYSQL_USER']) || 'root';
    const password = parseEnvValue(composeContent, ['MYSQL_PASSWORD', 'MYSQL_ROOT_PASSWORD']) || 'root';
    const db = parseEnvValue(composeContent, ['MYSQL_DATABASE']) || '';
    const dbPath = db ? `/${db}` : '';
    const uri = `mysql://${user}:${password}@${host}:${port}${dbPath}`;
    const jdbcUrl = `jdbc:mysql://${host}:${port}/${db}`;

    return {
      isDb: true,
      type: 'mysql',
      label: 'MySQL',
      icon: '🐬',
      port,
      user,
      password,
      database: db,
      uri,
      jdbcUrl,
      isOrbDirect,
      defaultClient: 'TablePlus / DBeaver / Navicat'
    };
  }

  // 3. Redis / Valkey
  if (
    nameLower.includes('redis') ||
    nameLower.includes('valkey') ||
    imageLower.includes('redis') ||
    imageLower.includes('valkey') ||
    hasPort(6379)
  ) {
    const port = portNum || 6379;
    const password = parseEnvValue(composeContent, ['REDIS_PASSWORD']) || '';
    const uri = password ? `redis://:${password}@${host}:${port}` : `redis://${host}:${port}`;

    return {
      isDb: true,
      type: 'redis',
      label: 'Redis',
      icon: '⚡',
      port,
      user: '',
      password,
      database: '0',
      uri,
      jdbcUrl: '',
      isOrbDirect,
      defaultClient: 'Redis Insight / Medis'
    };
  }

  // 4. MongoDB
  if (
    nameLower.includes('mongo') ||
    imageLower.includes('mongo') ||
    hasPort(27017)
  ) {
    const port = portNum || 27017;
    const user = parseEnvValue(composeContent, ['MONGO_INITDB_ROOT_USERNAME']) || '';
    const password = parseEnvValue(composeContent, ['MONGO_INITDB_ROOT_PASSWORD']) || '';
    const db = parseEnvValue(composeContent, ['MONGO_INITDB_DATABASE']) || '';
    const dbPath = db ? `/${db}` : '';
    const authPart = user && password ? `${user}:${password}@` : '';
    const uri = `mongodb://${authPart}${host}:${port}${dbPath}`;

    return {
      isDb: true,
      type: 'mongo',
      label: 'MongoDB',
      icon: '🍃',
      port,
      user,
      password,
      database: db,
      uri,
      jdbcUrl: '',
      isOrbDirect,
      defaultClient: 'MongoDB Compass'
    };
  }

  return { isDb: false };
}
