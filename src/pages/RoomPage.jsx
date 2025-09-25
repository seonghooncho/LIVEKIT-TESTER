// src/pages/RoomPage.jsx
import { useState } from "react";
import { Room } from "livekit-client";
import {
  RoomContext,
  RoomAudioRenderer,
  ControlBar,
} from "@livekit/components-react";
import "@livekit/components-styles";
import axios, { reissueAccessToken } from "../services/api";
import MyVideoConference from "../components/MyVideoConference";
import { getMember, issueCdnViewCookie, CDN_BASE } from "../services/api";

const serverUrl = import.meta.env.VITE_LIVEKIT_URL;

export default function RoomPage({ memberId }) {
  const [room] = useState(() => new Room({ adaptiveStream: true }));
  const [connected, setConnected] = useState(false);
  const [workspaceId, setWorkspaceId] = useState("");
  const [roomName, setRoomName] = useState("test-room");

  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);

  //아바타
  const [avatarSrc, setAvatarSrc] = useState("");
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  const joinRoom = async () => {
    try {
      const res = await axios.get(`/livekit/token`, {
        params: { workspaceId, roomName }, // 필요하면 roomName도 같이
      });
      const token = res.data.result || res.data.token || res.data.accessToken;
      if (token) {
        await room.connect(serverUrl, token);
        setConnected(true);
      } else {
        alert("방 참가 실패: 토큰 없음");
      }
    } catch (e) {
      console.error("방 참가 실패:", e);
      alert("방 참가 실패");
    }
  };

  const leaveRoom = () => {
    room.disconnect();
    setConnected(false);
  };

  const toggleMic = async () => {
    const newState = !micEnabled;
    await room.localParticipant.setMicrophoneEnabled(newState);
    setMicEnabled(newState);
  };

  const toggleCam = async () => {
    const newState = !camEnabled;
    await room.localParticipant.setCameraEnabled(newState);
    setCamEnabled(newState);
  };

  const toggleScreenShare = async () => {
    const newState = !screenSharing;
    await room.localParticipant.setScreenShareEnabled(newState);
    setScreenSharing(newState);
  };

  // 수동 재발급 테스트용
  const testReissue = async () => {
    try {
      const newToken = await reissueAccessToken();
      alert("재발급 성공");
      // 이후 요청부터는 인터셉터가 자동으로 Authorization 붙임
    } catch (e) {
      console.error(e);
      alert("재발급 실패");
    }
  };

  const handleShowAvatar = async () => {
    setAvatarLoading(true);
    setAvatarError("");
    setAvatarSrc("");

    try {
      const member = await getMember();
      // 서버 응답 형태에 맞춰 유연하게 objectKey 추출
      const objectKey =
        member?.profileImageObjectKey ||
        member?.profileImage?.objectKey ||
        member?.objectKey ||
        member?.profileImageKey;

      if (!objectKey) {
        throw new Error("멤버 응답에 objectKey가 없습니다.");
      }

      // 1) 쿠키 발급
      await issueCdnViewCookie(objectKey);

      // 2) CDN 요청 (쿠키 자동 전송)
      //    최신 이미지 보장 위해 임시로 캐시버스터 붙일 수 있음
      setAvatarSrc(`${CDN_BASE}/${objectKey}`);
    } catch (e) {
      console.error(e);
      setAvatarError(e?.message || "아바타 로드 실패");
    } finally {
      setAvatarLoading(false);
    }
  };

  return (
    <RoomContext.Provider value={room}>
      {connected ? (
        <div
          data-lk-theme="default"
          style={{ height: "100vh", position: "relative" }}
        >
          ///livekit
          <MyVideoConference />
          <RoomAudioRenderer />
          <ControlBar />
          <div style={{ position: "absolute", bottom: 60, left: 10 }}>
            <button onClick={toggleMic}>
              {micEnabled ? "마이크 끄기" : "마이크 켜기"}
            </button>
            <button onClick={toggleCam}>
              {camEnabled ? "카메라 끄기" : "카메라 켜기"}
            </button>
            <button onClick={toggleScreenShare}>
              {screenSharing ? "화면 공유 중지" : "화면 공유 시작"}
            </button>
            <button onClick={leaveRoom} style={{ marginLeft: "1rem" }}>
              방 나가기
            </button>
          </div>
        </div>
      ) : (
        <div style={{ color: "white", padding: "2rem" }}>
          <h2>LiveKit 테스트</h2>
          <input
            placeholder="워크스페이스 ID"
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
          />
          <br />
          <input
            placeholder="방 이름"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
          />
          <br />
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={joinRoom}>방 참가</button>
            <button onClick={testReissue}>토큰 재발급 테스트</button>
            <button onClick={handleShowAvatar}>프로필 이미지 보기</button>
          </div>
          <div style={{ marginTop: "1rem" }}>
            {avatarLoading && <div>불러오는 중…</div>}
            {avatarError && (
              <div style={{ color: "salmon" }}>{avatarError}</div>
            )}
            {avatarSrc && (
              <img
              src={avatarSrc}
              alt="profile"
              onLoad={() => console.log('img loaded')}
              onError={(e) => {
                console.log('img error', e);
                setAvatarError("이미지 로드 실패 (네트워크/캐시/디코딩)");
              }}
            /> 

            )}
          </div>
        </div>
      )}
    </RoomContext.Provider>
  );
}
