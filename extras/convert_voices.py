import os
import torch
import json


VOICE_NAMES = [
    "af_alloy", "af_aoede", "af_bella", "af_jessica", "af_kore", "af_nicole", 
    "af_nova", "af_river", "af_sarah", "af_sky", "am_adam", "am_echo", 
    "am_eric", "am_fenrir", "am_liam", "am_michael", "am_onyx", "am_puck", 
    "bf_alice", "bf_emma", "bf_isabella", "bf_lily", "bm_daniel", "bm_fable", 
    "bm_george", "bm_lewis", "ff_siwis", "hf_alpha", "hf_beta", "hm_omega", 
    "hm_psi", "jf_alpha", "zf_xiaobei", "zf_xiaoni", "zf_xiaoxiao", "zf_xiaoyi", 
    "zm_yunjian", "zm_yunxi", "zm_yunxia", "zm_yunyang"
]  # you need to have this in the /voices directory in the cwd


os.makedirs("voices_json", exist_ok=True)

def tensor_to_list(obj):
    if isinstance(obj, torch.Tensor):
        # //
        return obj.tolist()
    elif isinstance(obj, dict):
        return {k: tensor_to_list(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [tensor_to_list(v) for v in obj]
    else:
        return obj

for voice_name in VOICE_NAMES:
    try:
        voice_pack = torch.load(f'voices/{voice_name}.pt', weights_only=True)
        voice_data = tensor_to_list(voice_pack)

        with open(f"voices_json/{voice_name}.json", "w") as f:
            json.dump(voice_data, f)

        print(f"Converted and saved: {voice_name}")
    except Exception as e:
        print(f"Error processing {voice_name}: {e}")
