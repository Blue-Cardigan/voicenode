import type { Page } from "@playwright/test";

/**
 * Install browser-side stubs for getUserMedia + RTCPeerConnection.
 *
 * This is a *smoke* mock — enough to let the Start-talking button reach the
 * "connecting" state without requesting real microphone access or opening a
 * WebRTC peer connection. Deeper tool-call simulation (transcripts, agent
 * responses) is a follow-up; see TODO at end of file.
 */
export async function installVoiceMocks(page: Page) {
  await page.addInitScript(() => {
    // Silent MediaStream — single audio track, no real input device.
    const fakeStream = {
      id: "fake-stream",
      active: true,
      getTracks: () => [],
      getAudioTracks: () => [],
      getVideoTracks: () => [],
      addTrack: () => {},
      removeTrack: () => {},
      clone: () => fakeStream,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    } as unknown as MediaStream;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any;
    nav.mediaDevices = nav.mediaDevices ?? {};
    nav.mediaDevices.getUserMedia = async () => fakeStream;
    nav.mediaDevices.enumerateDevices = async () => [];

    // Minimal RTCPeerConnection no-op. ElevenLabs SDK may probe a few methods;
    // each one resolves or returns sentinel values that won't crash the SDK.
    class FakeRTCPeerConnection {
      connectionState = "new";
      iceConnectionState = "new";
      signalingState = "stable";
      ontrack: ((e: unknown) => void) | null = null;
      onconnectionstatechange: (() => void) | null = null;
      addTrack() {
        return {} as RTCRtpSender;
      }
      addTransceiver() {
        return {} as RTCRtpTransceiver;
      }
      createOffer() {
        return Promise.resolve({ type: "offer", sdp: "v=0\r\n" });
      }
      createAnswer() {
        return Promise.resolve({ type: "answer", sdp: "v=0\r\n" });
      }
      setLocalDescription() {
        return Promise.resolve();
      }
      setRemoteDescription() {
        return Promise.resolve();
      }
      addIceCandidate() {
        return Promise.resolve();
      }
      close() {}
      getSenders() {
        return [] as RTCRtpSender[];
      }
      addEventListener() {}
      removeEventListener() {}
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).RTCPeerConnection = FakeRTCPeerConnection;
  });

  // Stub the token endpoint so we never hit ElevenLabs.
  await page.route("**/api/agent/token**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ token: "fake-test-token" }),
    });
  });
}

// TODO(#14 follow-up): mock the ElevenLabs WS signalling channel + emit
// transcript events so we can drive tool-call assertions (create_shape, etc.)
// end-to-end. Deferred — requires intercepting the SDK's WebSocket handshake.
