'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { DATING_QUESTIONS, type QuestionOption } from '../questions';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [currentQuestion, setCurrentQuestion] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, QuestionOption>>({});
  const [loading, setLoading] = useState(true);

  const checkProfile = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth');
        return;
      }

      // First, check if a dating profile exists
      const { data: existingProfile, error: profileError } = await supabase
        .from('dating_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      // If no profile exists, create one
      if (!existingProfile) {
        const { error: createError } = await supabase
          .from('dating_profiles')
          .insert({
            user_id: session.user.id,
            answers: {},
            has_completed_profile: false
          });

        if (createError) throw createError;
        setCurrentQuestion(0);
        setAnswers({});
      } else {
        // If profile exists and is completed, redirect to matches
        if (existingProfile.has_completed_profile) {
          router.push('/dashboard/dating/matches');
          return;
        }

        // If profile exists but isn't completed, load existing answers
        if (existingProfile.answers) {
          const savedAnswers = existingProfile.answers as Record<number, QuestionOption>;
          setAnswers(savedAnswers);
          
          // Find the first unanswered question
          let nextUnansweredQuestion = 0;
          while (nextUnansweredQuestion < DATING_QUESTIONS.length && 
                 savedAnswers[nextUnansweredQuestion] !== undefined) {
            nextUnansweredQuestion++;
          }
          
          setCurrentQuestion(Math.min(nextUnansweredQuestion, DATING_QUESTIONS.length - 1));
        }
      }
    } catch (error) {
      console.error('Error checking profile:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  const completeProfile = useCallback(async (finalAnswers: Record<number, QuestionOption>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth');
        return;
      }

      // Check if all required questions are answered
      const isComplete = Object.keys(finalAnswers).length === DATING_QUESTIONS.length;
      
      // Validate each answer against the question options
      const hasValidAnswers = Object.entries(finalAnswers).every(([questionIndex, answer]) => {
        const question = DATING_QUESTIONS[parseInt(questionIndex)];
        if (!question) {
          console.error(`Question at index ${questionIndex} not found`);
          return false;
        }
        const isValidAnswer = question.options.includes(answer);
        if (!isValidAnswer) {
          console.error(`Invalid answer for question ${question.id}: ${answer}`);
          console.error('Valid options are:', question.options);
        }
        return isValidAnswer;
      });

      if (!hasValidAnswers) {
        console.error('Invalid answers:', finalAnswers);
        throw new Error('Some answers are invalid. Please check your responses.');
      }
      
      // Convert array indices to question IDs before saving
      const answersWithCorrectIds = Object.entries(finalAnswers).reduce((acc, [index, answer]) => {
        const question = DATING_QUESTIONS[parseInt(index)];
        if (question) {
          acc[question.id] = answer;
        }
        return acc;
      }, {} as Record<number, QuestionOption>);

      const { error } = await supabase
        .from('dating_profiles')
        .update({
          answers: answersWithCorrectIds,
          has_completed_profile: isComplete && hasValidAnswers
        })
        .eq('user_id', session.user.id);

      if (error) {
        console.error('Update error:', error);
        throw error;
      }

      if (isComplete && hasValidAnswers) {
        router.push('/dashboard/dating/matches');
      }
    } catch (error) {
      console.error('Error completing profile:', error);
      throw error;
    }
  }, [supabase, router]);

  const submitAnswer = useCallback(async (answer: QuestionOption) => {
    try {
      const newAnswers = { ...answers, [currentQuestion]: answer };
      setAnswers(newAnswers);

      // Save progress after each answer
      await completeProfile(newAnswers);

      // Move to next question if available
      if (currentQuestion < DATING_QUESTIONS.length - 1) {
        setCurrentQuestion(prev => Math.min(prev + 1, DATING_QUESTIONS.length - 1));
      } else {
        // All questions answered, validate final answers
        const allAnswered = Object.keys(newAnswers).length === DATING_QUESTIONS.length;
        if (allAnswered) {
          await completeProfile(newAnswers);
        }
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      alert(error instanceof Error ? error.message : 'Failed to save answer. Please try again.');
    }
  }, [currentQuestion, answers, completeProfile]);

  useEffect(() => {
    checkProfile();
  }, [checkProfile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const currentQ = DATING_QUESTIONS[currentQuestion];
  
  // Handle case where current question is undefined
  if (!currentQ) {
    console.error('Question index out of bounds:', currentQuestion);
    router.push('/dashboard/dating/matches');
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto bg-white/5 p-8 rounded-xl backdrop-blur-lg"
      >
        <div className="mb-8">
          <div className="w-full bg-white/10 rounded-full h-2 mb-4">
            <div 
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestion + 1) / DATING_QUESTIONS.length) * 100}%` }}
            />
          </div>
          <p className="text-sm text-gray-400">Question {currentQuestion + 1} of {DATING_QUESTIONS.length}</p>
        </div>

        <h2 className="text-2xl font-bold mb-6 text-white">{currentQ.question}</h2>
        
        <div className="grid grid-cols-2 gap-4">
          {currentQ.options.map((option, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => submitAnswer(option)}
              className="p-4 bg-white/5 hover:bg-white/10 rounded-lg text-white border border-white/10 transition-all duration-200"
            >
              {option}
            </motion.button>
          ))}
        </div>

        {currentQuestion > 0 && (
          <button
            onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
            className="mt-6 text-gray-400 hover:text-white transition"
          >
            Go back to previous question
          </button>
        )}
      </motion.div>
    </div>
  );
}
