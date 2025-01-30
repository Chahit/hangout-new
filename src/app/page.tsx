import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="mx-auto flex w-full flex-col items-center justify-center space-y-4 px-4 sm:w-[350px]">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            SNU Hangout
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Your campus, your community, your vibe
          </p>
        </div>
        <div className="w-full space-y-2">
          <Link href="/auth" className="w-full">
            <Button className="w-full">
              Sign In with SNU Email
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
