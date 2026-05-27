export type Personality = "WEAK" | "ANGRY" | "SARCASTIC" | "STOIC";
export type Gender = "M" | "F" | "N";

export interface Character {
  id: string;
  name: string;
  personality_type: Personality;
  gender_type: Gender;
  image_path: string;
  created_at: string;
  slotType?: "free" | "paid" | "default";
}

export interface ReactionResult {
  character_id: string;
  user_message: string;
  dialogue: string | string[];
  dialogue_id?: string;
  video_url: string | null;
  personality_type: Personality;
  gender_type?: string;
  input_tag?: string;
  intensity?: number;
  base_asset_code?: string | null;
  cached: boolean;
}

export type AppScreen = "login" | "home" | "create" | "character" | "token";
