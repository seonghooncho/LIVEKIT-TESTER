// src/services/api.js
import axios from "axios";
import { jwtDecode } from "jwt-decode";

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api",
  withCredentials: true,
});

/** ① request 인터셉터: 토큰 유효성 확인 & 조건부 헤더 부착 */
instance.interceptors.request.use((config) => {
  if (config.skipAuth) return config; // ← 로그아웃 등 스킵 옵션

  const token = localStorage.getItem("token");
  if (token) {
    try {
      const { exp } = jwtDecode(token); // exp = 초(sec)
      if (Date.now() < exp * 1000) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        // 만료 → 저장소 비우고 페이지 상태 갱신(아래 response 인터셉터에서 catch)
        localStorage.removeItem("token");
      }
    } catch (_) {
      localStorage.removeItem("token");
    }
  }
  return config;
});

/** ② response 인터셉터: 401/403 → 강제 로그아웃 */
instance.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && [401, 403].includes(err.response.status)) {
      localStorage.removeItem("token");
      // 새로고침하여 로그인 화면으로 돌림
      window.location.href = "/";
    }
    return Promise.reject(err);
  }
);

/** ③ 로그아웃 API 래퍼 */
export async function logout() {
  // access-token 헤더를 붙이지 않도록 skipAuth 옵션 사용
  await instance.post("/auth/logout", null, { skipAuth: true });
  localStorage.removeItem("token");
}

export default instance;
