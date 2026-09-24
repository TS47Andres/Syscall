/**
 * File: audio.ts
 * Role: Frames Sarvam μ-law output for Telnyx bidirectional RTP playback.
 * Service: Syscall voice-agent.
 */
export const PCMU_FRAME_BYTES = 160;

// Splits streaming 8 kHz μ-law audio into 20 ms frames and leaves the tail buffered.
export function takePcmuFrames(buffer: Buffer, frameBytes = PCMU_FRAME_BYTES): { frames: Buffer[]; remainder: Buffer } {
  const frames: Buffer[] = [];
  let offset = 0;
  while (buffer.length - offset >= frameBytes) {
    frames.push(buffer.subarray(offset, offset + frameBytes));
    offset += frameBytes;
  }
  return { frames, remainder: buffer.subarray(offset) };
}

// μ-law silence is 0xff; pad the final partial packet to one legal 20 ms frame.
export function finishPcmuFrame(buffer: Buffer, frameBytes = PCMU_FRAME_BYTES): Buffer | null {
  if (buffer.length === 0) return null;
  const frame = Buffer.alloc(frameBytes, 0xff);
  buffer.copy(frame, 0, 0, frameBytes);
  return frame;
}
