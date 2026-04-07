export type Personality = "WEAK" | "ANGRY" | "SARCASTIC" | "STOIC";
export type Gender = "M" | "F" | "N";

export interface Character {
  id: string;
  name: string;
  personality_type: Personality;
  gender_type: Gender;
  image_path: string;
  created_at: string;
}

export interface ReactionResult {
  character_id: string;
  user_message: string;
  dialogue: string;
  video_url: string | null;
  personality_type: Personality;
  cached: boolean;
}

export type AppScreen = "home" | "create" | "character" | "token";
