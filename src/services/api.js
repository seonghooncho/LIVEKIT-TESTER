// src/services/api.js
import axios from "axios";
import { jwtDecode } from "jwt-decode";

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api",
  withCredentials: true,
});

const instanceWithCookie = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api",
  withCredentials: true,
});

export const GOOGLE_LOGIN_URL =
  (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api").replace(
    "/api",
    ""
  ) + "/oauth2/authorization/google";

/** 수동 재발급 함수 */
export async function reissueAccessToken() {
  const res = await instance.post("/auth/reissue", null, { skipAuth: true });
  const newToken = res.data?.result || res.data?.token || res.data?.accessToken;
  if (!newToken) throw new Error("재발급 실패: 응답 바디에 토큰 없음");

  localStorage.setItem("token", newToken);
  return newToken;
}

/** ① request 인터셉터: 토큰 유효성 확인 & 조건부 헤더 부착 */
instance.interceptors.request.use((config) => {
  if (config.skipAuth) return config;

  const token = localStorage.getItem("token");
  if (token) {
    try {
      const { exp } = jwtDecode(token); // exp: seconds
      if (Date.now() < exp * 1000) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        // 만료: 제거 (response 인터셉터에서 자동 재발급 시도)
        localStorage.removeItem("token");
      }
    } catch {
      localStorage.removeItem("token");
    }
  }
  return config;
});

/** ② response 인터셉터: 401 → 자동 재발급(한 번만), 그 외 403 → 로그아웃 */
let isRefreshing = false;
let pendingQueue = [];

async function processQueue(error, token = null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (token) resolve(token);
    else reject(error);
  });
  pendingQueue = [];
}

instance.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    // 원 요청이 있고 401이며, 아직 재시도 안했고, skipAuth도 아님
    const status = err.response?.status;
    const shouldTryRefresh =
      status === 401 && !original?._retry && !original?.skipAuth;

    if (shouldTryRefresh) {
      if (isRefreshing) {
        // 이미 재발급 중이면 완료를 기다렸다가 다시 요청
        return new Promise((resolve, reject) => {
          pendingQueue.push({
            resolve: (token) => {
              original._retry = true;
              original.headers.Authorization = `Bearer ${token}`;
              resolve(instance(original));
            },
            reject,
          });
        });
      }

      isRefreshing = true;
      original._retry = true;

      try {
        const newToken = await reissueAccessToken(); // 쿠키 기반 재발급
        await processQueue(null, newToken);

        // 갱신된 토큰으로 원 요청 재시도
        original.headers.Authorization = `Bearer ${newToken}`;
        return instance(original);
      } catch (refreshErr) {
        await processQueue(refreshErr, null);
        localStorage.removeItem("token");
        window.location.href = "/";
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    // 403 등은 바로 로그아웃 처리
    if (status === 403) {
      localStorage.removeItem("token");
      window.location.href = "/";
    }

    return Promise.reject(err);
  }
);

/** ③ 로그아웃 API 래퍼 */
export async function logout() {
  await instance.post("/auth/logout", null, { skipAuth: true });
  localStorage.removeItem("token");
}
export const CDN_BASE =
  import.meta.env.VITE_CDN_BASE_URL || "https://cdn.syncly-io.com";

// --- 멤버 조회
export async function getMember() {
  const res = await instance.get("/member", { withCredentials: false }); // (백엔드가 /api/member 라우트)
  if (res?.status !== 200) throw new Error("멤버 조회 실패");
  // 래핑 여부에 대비해 유연 파싱
  return res.data?.result ?? res.data;
}

// --- CloudFront Signed Cookie 발급
export async function issueCdnViewCookie(objectKey) {
  if (!objectKey) throw new Error("objectKey가 없습니다.");
  const res = await instance.post(
    "/s3/view-cookie",
    { objectKey },
    {
      // skipAuth: true, // 백엔드가 인증 필요 없다면 사용
    }
  );
  if (!res?.status || res.status >= 400) {
    throw new Error(`view-cookie 실패: ${res?.status}`);
  }
  // Set-Cookie는 브라우저가 자동 저장
  return true;
}

export default instance;
