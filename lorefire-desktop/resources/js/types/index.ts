export interface Campaign {
  id: number
  name: string
  dm_name: string | null
  description: string | null
  setting: string | null
  notes: string | null
  art_style: 'comic' | 'lifelike'
  party_image_path: string | null
  party_image_generation_status: 'idle' | 'generating' | 'done' | 'failed'
  is_active: boolean
  characters?: Character[]
  npcs?: Npc[]
  game_sessions?: GameSession[]
  speaker_profiles?: SpeakerProfile[]
  characters_count?: number
  game_sessions_count?: number
  npcs_count?: number
  created_at: string
  updated_at: string
}

export interface Character {
  id: number
  campaign_id: number | null
  name: string
  player_name: string | null
  race: string
  subrace: string | null
  class: string
  subclass: string | null
  level: number
  background: string | null
  alignment: string | null
  experience_points: number
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
  max_hp: number
  current_hp: number
  temp_hp: number
  armor_class: number
  initiative_bonus: number
  speed: number
  proficiency_bonus: number
  death_save_successes: number
  death_save_failures: number
  saving_throw_proficiencies: string[] | null
  skill_proficiencies: string[] | null
  skill_expertises: string[] | null
  copper: number
  silver: number
  electrum: number
  gold: number
  platinum: number
  spellcasting_ability: string | null
  spell_slots: Record<string, number> | null
  spell_slots_used: Record<string, number> | null
  personality_traits: string | null
  ideals: string | null
  bonds: string | null
  flaws: string | null
  backstory: string | null
  appearance_description: string | null
  portrait_path: string | null
  portrait_generation_status: 'idle' | 'generating' | 'done' | 'failed'
  portrait_style: 'lifelike' | 'renaissance' | 'comic'
  dnd_beyond_url: string | null
  class_features: Record<string, unknown> | null
  campaign?: Campaign
  spells?: CharacterSpell[]
  inventory_items?: InventoryItem[]
  inventory_snapshots?: InventorySnapshot[]
  features?: CharacterFeature[]
  conditions?: CharacterCondition[]
  created_at: string
  updated_at: string
}

export interface CharacterSpell {
  id: number
  character_id: number
  name: string
  level: number
  school: string | null
  casting_time: string | null
  range: string | null
  components: string | null
  duration: string | null
  concentration: boolean
  ritual: boolean
  description: string | null
  is_prepared: boolean
}

export interface InventoryItem {
  id: number
  character_id: number
  name: string
  category: string | null
  quantity: number
  weight: number
  value_cp: number
  equipped: boolean
  attuned: boolean
  is_magical: boolean
  requires_attunement: boolean
  description: string | null
  properties: string[] | null
}

export interface InventorySnapshot {
  id: number
  character_id: number
  game_session_id: number | null
  label: string
  snapshot_type: 'manual' | 'session'
  items: InventoryItem[]
  game_session?: GameSession | null
  created_at: string
  updated_at: string
}

export interface CharacterFeature {
  id: number
  character_id: number
  name: string
  source: string | null
  level_gained: number | null
  description: string | null
  has_uses: boolean
  max_uses: number | null
  uses_remaining: number | null
  recharge_on: string | null
}

export interface CharacterCondition {
  id: number
  character_id: number
  condition: string
  exhaustion_level: number
  notes: string | null
}

export interface Npc {
  id: number
  campaign_id: number
  name: string
  race: string | null
  role: string | null
  location: string | null
  last_seen: string | null
  tags: string[] | null
  voice_description: string | null
  stat_block: Record<string, unknown> | null
  attitude: 'friendly' | 'neutral' | 'hostile' | null
  description: string | null
  notes: string | null
  portrait_path: string | null
  is_alive: boolean
}

export interface GameSession {
  id: number
  campaign_id: number
  title: string
  session_number: number | null
  played_at: string | null
  summary: string | null
  dm_notes: string | null
  key_events: string | null
  next_session_notes: string | null
  participant_character_ids: number[] | null
  audio_path: string | null
  transcript_path: string | null
  transcription_status: 'none' | 'pending' | 'processing' | 'done' | 'failed' | 'cancelled'
  summary_status: 'idle' | 'generating' | 'done' | 'failed'
  art_prompts_status: 'idle' | 'generating' | 'done' | 'failed' | 'cancelled'
  extraction_status: 'idle' | 'generating' | 'done' | 'failed'
  session_notes: string | null
  duration_seconds: number | null
  encounters?: Encounter[]
  events?: SessionEvent[]
  scene_art_prompts?: SceneArtPrompt[]
  campaign?: Campaign
}

export interface Encounter {
  id: number
  game_session_id: number
  name: string | null
  round_count: number
  status: 'auto_detected' | 'confirmed' | 'dismissed'
  transcript_start_second: number | null
  transcript_end_second: number | null
  summary: string | null
  turns?: EncounterTurn[]
}

export interface EncounterTurn {
  id: number
  encounter_id: number
  round_number: number
  turn_order: number
  actor_name: string
  actor_type: string
  action_description: string | null
  action_type: string | null
  damage_dealt: number | null
  healing_done: number | null
  target_name: string | null
  is_critical: boolean
  transcript_second: number | null
}

export interface SessionEvent {
  id: number
  game_session_id: number
  type: string
  title: string | null
  body: string | null
  transcript_second: number | null
}

export interface SceneArtPrompt {
  id: number
  game_session_id: number
  scene_title: string | null
  scene_description: string | null
  prompt: string | null
  negative_prompt: string | null
  art_style: 'comic' | 'lifelike'
  character_refs: Array<{ character_id: number; name: string; image_path: string | null }> | null
  transcript_second: number | null
  status: 'pending' | 'generated' | 'generating' | 'image_ready' | 'cancelled'
  image_path: string | null
}

export interface SpeakerProfile {
  id: number
  campaign_id: number
  game_session_id: number | null
  speaker_label: string  // e.g. "SPEAKER_00"
  display_name: string
  character_id: number | null
  is_dm: boolean
  character?: Character | null
}

export interface AppSettings {
  llm_provider: string | null
  openai_api_key: string | null
  anthropic_api_key: string | null
  ollama_base_url: string | null
  ollama_model: string | null
  zai_api_key: string | null
  zai_model: string | null
  zai_plan: string | null
  zai_base_url: string | null
  whisperx_model: string | null
  whisperx_language: string | null
  huggingface_token: string | null
  default_art_style: string | null
  image_gen_provider: string | null
  image_gen_model: string | null
  image_gen_zai_api_key: string | null
  comfyui_base_url: string | null
}

// Inertia shared props
export interface PageProps {
  ziggy?: Record<string, unknown>
  flash?: {
    success?: string | null
    error?: string | null
    info?: string | null
  }
  python_setup?: {
    status: 'not_started' | 'running' | 'ready' | 'failed'
    error?: string | null
    onboarding_complete: boolean
  }
}
