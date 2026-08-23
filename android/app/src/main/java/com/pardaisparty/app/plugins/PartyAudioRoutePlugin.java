package com.pardaisparty.app.plugins;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioDeviceInfo;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Build;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginMethod;

@CapacitorPlugin(name = "PartyAudioRoute")
public class PartyAudioRoutePlugin extends Plugin {
    private AudioManager audioManager;
    private AudioFocusRequest audioFocusRequest;
    private boolean partyAudioActive = false;

    private AudioManager getAudioManager() {
        if (audioManager == null) {
            audioManager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        }
        return audioManager;
    }

    @PluginMethod
    public void setSpeakerphone(PluginCall call) {
        boolean enabled = call.getBoolean("enabled", true);
        try {
            AudioManager manager = getAudioManager();
            if (manager == null) throw new IllegalStateException("AudioManager unavailable");

            if (enabled) {
                partyAudioActive = true;
                manager.setMode(AudioManager.MODE_IN_COMMUNICATION);
                requestAudioFocus(manager);

                // Android 12+: explicitly select the built-in speaker as the
                // communication output. This is what prevents WebRTC/Agora
                // voice from being routed to the earpiece/receiver.
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    AudioDeviceInfo speaker = findBuiltInSpeaker(manager);
                    if (speaker != null) {
                        manager.setCommunicationDevice(speaker);
                    }
                } else {
                    manager.setSpeakerphoneOn(true);
                }
            } else {
                partyAudioActive = false;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    manager.clearCommunicationDevice();
                } else {
                    manager.setSpeakerphoneOn(false);
                }
                abandonAudioFocus(manager);
                manager.setMode(AudioManager.MODE_NORMAL);
            }

            JSObject result = new JSObject();
            result.put("enabled", enabled);
            result.put("speakerSelected", enabled);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Unable to route party audio to media speaker", e);
        }
    }

    private AudioDeviceInfo findBuiltInSpeaker(AudioManager manager) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return null;
        for (AudioDeviceInfo device : manager.getAvailableCommunicationDevices()) {
            if (device.getType() == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER) return device;
        }
        return null;
    }

    private void requestAudioFocus(AudioManager manager) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                AudioAttributes attributes = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build();
                audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE)
                        .setAudioAttributes(attributes)
                        .setAcceptsDelayedFocusGain(false)
                        .setWillPauseWhenDucked(false)
                        .build();
                manager.requestAudioFocus(audioFocusRequest);
            } else {
                manager.requestAudioFocus(null, AudioManager.STREAM_VOICE_CALL, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT);
            }
        } catch (Exception ignored) {
        }
    }

    private void abandonAudioFocus(AudioManager manager) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
                manager.abandonAudioFocusRequest(audioFocusRequest);
                audioFocusRequest = null;
            } else {
                manager.abandonAudioFocus(null);
            }
        } catch (Exception ignored) {
        }
    }

    @Override
    protected void handleOnDestroy() {
        try {
            if (partyAudioActive) {
                AudioManager manager = getAudioManager();
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    manager.clearCommunicationDevice();
                } else {
                    manager.setSpeakerphoneOn(false);
                }
                abandonAudioFocus(manager);
                manager.setMode(AudioManager.MODE_NORMAL);
            }
        } catch (Exception ignored) {
        }
        super.handleOnDestroy();
    }
}
