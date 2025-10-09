import { Coins, Trophy, Flame } from "lucide-react";

interface ShareCardProps {
  xp: number;
  streak: number;
  level: number;
  studentName: string;
  shareCode: string;
}

export const ShareCard = ({ xp, streak, level, studentName, shareCode }: ShareCardProps) => {
  return (
    <div
      id="share-card"
      className="w-[600px] h-[600px] bg-gradient-to-br from-primary via-primary-glow to-secondary p-8 flex flex-col items-center justify-center text-white relative overflow-hidden"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-40 h-40 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute bottom-10 right-10 w-60 h-60 rounded-full bg-white/20 blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center space-y-6">
        {/* Student Name */}
        <h2 className="text-2xl font-bold opacity-90">{studentName}</h2>

        {/* Main Achievement */}
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Flame className="w-12 h-12 text-orange-400" />
            <div>
              <p className="text-lg opacity-90">I earned</p>
              <div className="flex items-center gap-2">
                <Coins className="w-8 h-8 text-yellow-300" />
                <span className="text-6xl font-black">{xp}</span>
              </div>
              <p className="text-2xl font-bold">Jhakkas Points today!</p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex items-center justify-center gap-8 pt-6">
            <div className="flex items-center gap-2 bg-white/10 px-6 py-3 rounded-full backdrop-blur-sm">
              <Flame className="w-6 h-6 text-orange-400" />
              <span className="text-2xl font-bold">{streak}</span>
              <span className="text-lg opacity-90">day streak</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-6 py-3 rounded-full backdrop-blur-sm">
              <Trophy className="w-6 h-6 text-yellow-400" />
              <span className="text-2xl font-bold">Level {level}</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="pt-8 space-y-3">
          <p className="text-xl font-semibold">
            Get your rank and gamify your learning experience!
          </p>
          <div className="bg-white/20 backdrop-blur-sm px-6 py-4 rounded-2xl">
            <p className="text-2xl font-bold">👉 jhakkaslearning.com</p>
            <p className="text-sm opacity-75 mt-1">Use code: {shareCode}</p>
          </div>
        </div>

        {/* Branding */}
        <div className="pt-6">
          <p className="text-sm opacity-75">#JhakkasLearning #GamifiedEducation</p>
        </div>
      </div>
    </div>
  );
};
