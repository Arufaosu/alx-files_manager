import redisClient from '../utils/redis';
import dbClient from '../utils/db';

export function getStatus() {
  return { redis: redisClient.isAlive(), db: dbClient.isAlive() };
}

export async function getStats() {
  try {
    const usersCountPromise = dbClient.nbUsers();
    const filesCountPromise = dbClient.nbFiles();

    const [usersCount, filesCount] = await Promise.all([usersCountPromise, filesCountPromise]);

    return { users: usersCount, files: filesCount };
  } catch (error) {
    console.error('Error retrieving stats:', error);
    throw error;
  }
}
