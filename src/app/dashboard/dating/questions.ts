// Define all possible options as a union type
export type DatingOption = 
  | "Reading" | "Gaming" | "Sports" | "Movies" | "Traveling" | "Cooking" | "Music" | "Art" | "Shopping" | "Hiking"
  | "Texting" | "Calling" | "InPerson" | "Email" | "VideoChat" | "Letters" | "Voice Messages"
  | "Pop" | "Rock" | "HipHop" | "Classical" | "Jazz" | "Electronic" | "Folk" | "Metal" | "RnB" | "Country"
  | "Exercise" | "Meditation" | "Sleep" | "Talk" | "Write" | "Nature" | "Food" | "Games" | "Work"
  | "Dinner" | "Adventure" | "Concert" | "Museum" | "Park" | "Beach" | "Cafe"
  | "Logical" | "Emotional" | "Intuitive" | "Analytical" | "Cautious" | "Quick" | "Collaborative"
  | "Touch" | "Words" | "Gifts" | "Time" | "Acts" | "All"
  | "City" | "Suburb" | "Rural" | "Mountain" | "Forest" | "Island" | "Desert"
  | "Wealth" | "Impact" | "Freedom" | "Knowledge" | "Fame" | "Power" | "Balance" | "Happiness"
  | "Parties" | "SmallGroups" | "OneOnOne" | "Alone" | "Family" | "Crowds" | "Online"
  | "Creative" | "Systematic" | "Independent" | "Bold"
  | "Dog" | "Cat" | "Bird" | "Fish" | "Reptile" | "None" | "Multiple" | "Exotic"
  | "Watching" | "Doing" | "Teaching" | "Discussion" | "Writing" | "Experience"
  | "Indian" | "Italian" | "Chinese" | "Japanese" | "Mexican" | "Thai" | "French" | "American" | "Mediterranean"
  | "Learning" | "Creating" | "Relaxing" | "Socializing" | "Entertainment" | "Hobbies"
  | "Technology" | "Arts" | "Science" | "Business" | "Healthcare" | "Education" | "Media"
  | "Openly" | "Reserved" | "Actions" | "Writing" | "Rarely"
  | "Spring" | "Summer" | "Fall" | "Winter"
  | "Casual" | "Serious" | "Friendship" | "Traditional" | "Modern" | "Spontaneous" | "Planned"
  | "Mountain" | "Cruise" | "Camping" | "Resort" | "RoadTrip" | "Staycation";

export interface DatingQuestion {
  id: number;
  question: string;
  options: DatingOption[];
}

export const DATING_QUESTIONS: DatingQuestion[] = [
  {
    id: 1,
    question: "What's your ideal weekend activity?",
    options: ["Reading", "Gaming", "Sports", "Movies", "Traveling", "Cooking", "Music", "Art", "Shopping", "Hiking"]
  },
  {
    id: 2,
    question: "How do you prefer to communicate?",
    options: ["Texting", "Calling", "InPerson", "Email", "VideoChat", "Letters", "Voice Messages"]
  },
  {
    id: 3,
    question: "What's your preferred music genre?",
    options: ["Pop", "Rock", "HipHop", "Classical", "Jazz", "Electronic", "Folk", "Metal", "RnB", "Country"]
  },
  {
    id: 4,
    question: "How do you handle stress?",
    options: ["Exercise", "Meditation", "Sleep", "Talk", "Write", "Music", "Nature", "Food", "Games", "Work"]
  },
  {
    id: 5,
    question: "What's your ideal date?",
    options: ["Dinner", "Movies", "Adventure", "Concert", "Museum", "Park", "Beach", "Cafe", "Sports", "Cooking"]
  },
  {
    id: 6,
    question: "How do you make decisions?",
    options: ["Logical", "Emotional", "Intuitive", "Analytical", "Cautious", "Quick", "Collaborative"]
  },
  {
    id: 7,
    question: "What's your love language?",
    options: ["Touch", "Words", "Gifts", "Time", "Acts", "All"]
  },
  {
    id: 8,
    question: "What's your ideal living environment?",
    options: ["City", "Suburb", "Rural", "Beach", "Mountain", "Forest", "Island", "Desert"]
  },
  {
    id: 9,
    question: "How do you view success?",
    options: ["Wealth", "Impact", "Freedom", "Knowledge", "Fame", "Power", "Balance", "Happiness"]
  },
  {
    id: 10,
    question: "What's your preferred social setting?",
    options: ["Parties", "SmallGroups", "OneOnOne", "Alone", "Family", "Crowds", "Nature", "Online"]
  },
  {
    id: 11,
    question: "How do you approach problems?",
    options: ["Creative", "Systematic", "Collaborative", "Independent", "Cautious", "Bold", "Analytical"]
  },
  {
    id: 12,
    question: "What's your ideal pet?",
    options: ["Dog", "Cat", "Bird", "Fish", "Reptile", "None", "Multiple", "Exotic"]
  },
  {
    id: 13,
    question: "How do you prefer to learn?",
    options: ["Reading", "Watching", "Doing", "Teaching", "Discussion", "Writing", "Experience"]
  },
  {
    id: 14,
    question: "What's your preferred cuisine?",
    options: ["Indian", "Italian", "Chinese", "Japanese", "Mexican", "Thai", "French", "American", "Mediterranean"]
  },
  {
    id: 15,
    question: "How do you spend your free time?",
    options: ["Learning", "Creating", "Relaxing", "Socializing", "Exercise", "Entertainment", "Nature", "Hobbies"]
  },
  {
    id: 16,
    question: "What's your ideal career field?",
    options: ["Technology", "Arts", "Science", "Business", "Healthcare", "Education", "Media"]
  },
  {
    id: 17,
    question: "How do you express emotions?",
    options: ["Openly", "Reserved", "Actions", "Words", "Art", "Music", "Writing", "Rarely"]
  },
  {
    id: 18,
    question: "What's your preferred season?",
    options: ["Spring", "Summer", "Fall", "Winter"]
  },
  {
    id: 19,
    question: "How do you approach relationships?",
    options: ["Casual", "Serious", "Friendship", "Traditional", "Modern", "Spontaneous", "Planned"]
  },
  {
    id: 20,
    question: "What's your ideal vacation?",
    options: ["Beach", "Mountain", "City", "Cruise", "Camping", "Resort", "RoadTrip", "Staycation"]
  }
];

export type QuestionId = number;
export type QuestionOption = DatingOption;

// Matching algorithm weights for different question categories
export const QUESTION_WEIGHTS: Record<number, number> = {
  // Core values and lifestyle (higher weight)
  4: 2.0,  // stress handling
  6: 2.0,  // decision making
  7: 2.0,  // love language
  9: 2.0,  // view of success
  17: 2.0, // emotional expression
  19: 2.0, // relationship approach

  // Personal interests (medium weight)
  1: 1.5,  // weekend activity
  3: 1.5,  // music
  5: 1.5,  // ideal date
  15: 1.5, // free time

  // General preferences (normal weight)
  2: 1.0,  // communication
  8: 1.0,  // living environment
  10: 1.0, // social setting
  11: 1.0, // problem approach
  12: 1.0, // pets
  13: 1.0, // learning
  14: 1.0, // cuisine
  16: 1.0, // career
  18: 1.0, // season
  20: 1.0  // vacation
};

// Calculate compatibility score between two users' answers
export function calculateCompatibilityScore(
  userAnswers: Record<QuestionId, QuestionOption>,
  otherAnswers: Record<QuestionId, QuestionOption>
): number {
  let totalWeight = 0;
  let matchedWeight = 0;

  for (const question of DATING_QUESTIONS) {
    const weight = QUESTION_WEIGHTS[question.id] || 1.0;
    totalWeight += weight;

    if (userAnswers[question.id] === otherAnswers[question.id]) {
      matchedWeight += weight;
    }
  }

  return matchedWeight / totalWeight;
}

// Question Categories and their weights
export const QUESTION_CATEGORIES = {
  CORE_VALUES: {
    weight: 2.5,
    questions: [4, 6, 7, 9, 17, 19],
    threshold: 0.7,
    description: "Fundamental values and approach to relationships"
  },
  LIFESTYLE: {
    weight: 2.0,
    questions: [1, 8, 10, 15],
    threshold: 0.5,
    description: "Daily life and social preferences"
  },
  INTERESTS: {
    weight: 1.5,
    questions: [3, 5, 14, 16],
    threshold: 0.4,
    description: "Personal interests and activities"
  },
  PREFERENCES: {
    weight: 1.0,
    questions: [2, 11, 12, 13, 18, 20],
    threshold: 0.3,
    description: "General preferences and choices"
  }
};

// Compatible answer pairs with similarity scores
const ANSWER_SIMILARITIES: Record<number, Record<string, number>> = {
  2: { // Communication
    'Texting-VideoChat': 0.8,
    'VideoChat-Texting': 0.8,
    'Calling-VideoChat': 0.9,
    'VideoChat-Calling': 0.9,
    'InPerson-VideoChat': 0.7,
    'VideoChat-InPerson': 0.7,
  },
  10: { // Social setting
    'Parties-Crowds': 0.8,
    'Crowds-Parties': 0.8,
    'SmallGroups-OneOnOne': 0.7,
    'OneOnOne-SmallGroups': 0.7,
    'Family-SmallGroups': 0.8,
    'SmallGroups-Family': 0.8,
  },
  4: { // Stress handling
    'Exercise-Sports': 0.9,
    'Sports-Exercise': 0.9,
    'Meditation-Nature': 0.8,
    'Nature-Meditation': 0.8,
    'Music-Write': 0.7,
    'Write-Music': 0.7,
  }
  // Add more compatible answers for other questions
};

function getAnswerSimilarity(questionId: number, answer1: string, answer2: string): number {
  if (answer1 === answer2) return 1.0;
  
  const similarities = ANSWER_SIMILARITIES[questionId];
  if (!similarities) return 0;

  return similarities[`${answer1}-${answer2}`] || 0;
}

export function calculateEnhancedCompatibilityScore(
  userAnswers: Record<number, string>,
  otherAnswers: Record<number, string>
): { 
  score: number; 
  categoryScores: Record<string, number>;
  details: {
    category: string;
    score: number;
    questions: Array<{
      id: number;
      similarity: number;
    }>;
  }[];
} {
  let totalWeight = 0;
  let weightedScore = 0;
  const categoryScores: Record<string, number> = {};
  const details: Array<{
    category: string;
    score: number;
    questions: Array<{ id: number; similarity: number }>;
  }> = [];

  // Calculate scores per category
  for (const [category, config] of Object.entries(QUESTION_CATEGORIES)) {
    let categoryScore = 0;
    const questionScores: Array<{ id: number; similarity: number }> = [];

    for (const questionId of config.questions) {
      const similarity = getAnswerSimilarity(
        questionId,
        userAnswers[questionId],
        otherAnswers[questionId]
      );
      categoryScore += similarity;
      questionScores.push({ id: questionId, similarity });
    }

    const avgCategoryScore = categoryScore / config.questions.length;
    categoryScores[category] = avgCategoryScore;

    details.push({
      category,
      score: avgCategoryScore,
      questions: questionScores
    });

    // Apply category weight to total score if meets threshold
    if (avgCategoryScore >= config.threshold) {
      weightedScore += avgCategoryScore * config.weight;
      totalWeight += config.weight;
    }
  }

  return {
    score: totalWeight > 0 ? weightedScore / totalWeight : 0,
    categoryScores,
    details
  };
} 