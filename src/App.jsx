import { useState } from "react";
import LoginPage from "./pages/LoginPage";
import RoomPage from "./pages/RoomPage";
import { logout } from "./services/api";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [memberId, setMemberId] = useState(null);

  const handleLogin = (newToken, memberId) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setMemberId(memberId);
  };
  const handleLogout = async () => {
    await logout();
    setToken(null); // 상태 초기화
  };

  return (
    <div style={{ background: "#1e1e1e", height: "100vh" }}>
      {token ? (
        <>
          <button
            onClick={handleLogout}
            style={{ position: "absolute", top: 10, right: 10 }}
          >
            로그아웃
          </button>
          <RoomPage memberId={memberId} />
        </>
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}
    </div>
  );
}
