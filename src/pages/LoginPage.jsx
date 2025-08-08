import { useState } from "react";
import axios from "../services/api";

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      const res = await axios.post("/auth/login", { email, password });

      // ✅ Access Token: Authorization 헤더에서 추출
      const rawHeader = res.headers["authorization"];
      const accessToken = rawHeader?.startsWith("Bearer ")
        ? rawHeader.slice(7)
        : null;

      if (accessToken) {
        localStorage.setItem("token", accessToken);
        onLogin(accessToken); // App.jsx로 전달
      } else {
        alert("로그인 실패: Authorization 헤더 없음");
      }
    } catch (err) {
      alert("로그인 실패: " + (err?.response?.data?.message || err.message));
    }
  };

  return (
    <div style={{ padding: "2rem", color: "white" }}>
      <h2>로그인</h2>
      <input
        type="email"
        placeholder="이메일"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <br />
      <input
        type="password"
        placeholder="비밀번호"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <br />
      <button onClick={handleLogin}>로그인</button>
    </div>
  );
}
