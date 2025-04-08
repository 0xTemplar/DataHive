import React from 'react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  subValue?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  subValue,
}) => (
  <div className="bg-[#f5f5fa0a] rounded-xl p-6 border border-[#f5f5fa14] hover:border-[#f5f5fa29] transition-colors">
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <span className="text-[#f5f5fa7a] text-sm">{label}</span>
        <div className="flex items-baseline gap-2">
          {typeof value === 'number' && label.includes('Amount') ? (
            <>
              <span className="text-2xl font-bold text-white">
                {value.toLocaleString()}
              </span>
              <span className="text-[#f5f5fa7a]">MOVE</span>
            </>
          ) : (
            <span className="text-2xl font-bold text-white">{value}</span>
          )}
        </div>
        {subValue && <p className="text-sm text-[#f5f5fa7a]">{subValue}</p>}
      </div>
      <div className="p-3 bg-[#f5f5fa0a] rounded-lg">{icon}</div>
    </div>
  </div>
);

export default StatCard;
