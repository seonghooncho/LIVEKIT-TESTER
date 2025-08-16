import { useState } from "react";
import axios from "../services/api";

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      const res = await axios.post("/auth/login", { email, password });

      // ✅ 응답 바디에서 access token 추출
      const accessToken = res.data?.result;

      if (accessToken) {
        localStorage.setItem("token", accessToken);
        onLogin(accessToken); // App.jsx로 전달
      } else {
        alert("로그인 실패: 응답 바디에 토큰 없음");
      }
    } catch (err) {
      console.error(err);
      alert("로그인 요청 실패");
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
