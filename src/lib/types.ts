export type Resource = {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string;
  course_code: string | null;
  uploaded_by: string;
  category: 'notes' | 'past_paper' | 'study_material';
  tags: string[];
  downloads: number;
  created_at: string;
};

export type Course = {
  id: string;
  course_code: string;
  title: string;
  description: string | null;
  department: string;
  credits: number;
  prerequisites: string[];
};

export type CourseReview = {
  id: string;
  course_id: string;
  reviewer_id: string;
  rating: number;
  difficulty: number;
  workload: number;
  content: string;
  semester: string;
  year: number;
  created_at: string;
};

export type Mentorship = {
  id: string;
  mentor_id: string;
  mentee_id: string;
  subjects: string[];
  status: 'pending' | 'active' | 'completed' | 'rejected';
  created_at: string;
};

export type Event = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  organizer_id: string;
  group_id: string | null;
  category: string;
  max_participants: number | null;
  is_public: boolean;
  created_at: string;
};

export type EventParticipant = {
  event_id: string;
  user_id: string;
  status: 'going' | 'maybe' | 'not_going';
  created_at: string;
};

export type VoiceMessage = {
  id: string;
  sender_id: string;
  group_id: string | null;
  receiver_id: string | null;
  audio_url: string;
  duration: number;
  transcription: string | null;
  created_at: string;
};

export type ModerationLog = {
  id: string;
  content_type: string;
  content_id: string;
  content_text: string | null;
  moderation_score: number;
  categories: string[];
  action_taken: 'flagged' | 'hidden' | 'deleted';
  created_at: string;
}; 