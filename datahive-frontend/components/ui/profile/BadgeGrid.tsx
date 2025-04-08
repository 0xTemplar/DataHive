import React from 'react';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: JSX.Element;
  color: string;
  earnedDate?: string;
}

interface BadgeGridProps {
  badges: Badge[];
}

const BadgeGrid: React.FC<BadgeGridProps> = ({ badges }) => {
  return (
    <div className="mb-12">
      <h2 className="text-xl font-bold mb-6">Badges & Achievements</h2>
      {badges.length === 0 ? (
        <div className="bg-[#f5f5fa0a] rounded-xl p-8 border border-[#f5f5fa14] text-center">
          <p className="text-[#f5f5fa7a] mb-4">No badges earned yet</p>
          <p className="text-sm text-[#f5f5fa7a]">
            Complete tasks and contribute to campaigns to earn badges and
            increase your reputation.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className="bg-[#f5f5fa0a] rounded-xl p-6 border border-[#f5f5fa14] hover:border-[#f5f5fa29] transition-all hover:transform hover:scale-[1.02] group"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`p-3 rounded-xl bg-gradient-to-r ${
                    badge.color
                  } group-hover:shadow-lg group-hover:shadow-${
                    badge.color.split('-')[2]
                  }/20 transition-all`}
                >
                  {badge.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold mb-1">{badge.name}</h3>
                    {badge.earnedDate && (
                      <span className="text-xs text-[#f5f5fa7a] bg-[#f5f5fa0a] px-2 py-1 rounded-full">
                        {badge.earnedDate}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[#f5f5fa7a]">
                    {badge.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BadgeGrid;
