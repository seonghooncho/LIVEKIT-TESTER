import { useState } from "react";
import { Room } from "livekit-client";
import {
  RoomContext,
  RoomAudioRenderer,
  ControlBar,
} from "@livekit/components-react";
import "@livekit/components-styles";
import axios from "../services/api";
import MyVideoConference from "../components/MyVideoConference";

const serverUrl = import.meta.env.VITE_LIVEKIT_URL;

export default function RoomPage({ memberId }) {
  const [room] = useState(() => new Room({ adaptiveStream: true }));
  const [connected, setConnected] = useState(false);
  const [workspaceId, setWorkspaceId] = useState("");
  const [roomName, setRoomName] = useState("test-room");

  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);

  const joinRoom = async () => {
    try {
      const res = await axios.get(`/livekit/token`, {
        params: { workspaceId },
      });
      const token = res.data.result || res.data.token;
      console.log("LiveKit 토큰:", token);
      if (token) {
        await room.connect(serverUrl, token);
        setConnected(true);
        // 카메라/마이크는 ControlBar에서 직접 켜기(최적의 UX)
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

  return (
    <RoomContext.Provider value={room}>
      {connected ? (
        <div data-lk-theme="default" style={{ height: "100vh" }}>
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
          <button onClick={joinRoom}>방 참가</button>
        </div>
      )}
    </RoomContext.Provider>
  );
}
