import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '1m', target: 1000 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TOURNAMENT_ID = __ENV.TOURNAMENT_ID || '00000000-0000-0000-0000-000000000020';

export default function () {
  const res = http.get(`${BASE_URL}/api/tournaments/${TOURNAMENT_ID}/leaderboard`);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'content-type is json': (r) => r.headers['Content-Type']?.includes('application/json'),
  });

  sleep(1);
}

export function teardown(data) {
  console.log('Load test completed');
}
