import React from 'react';
import { Sparklines, SparklinesLine, SparklinesSpots } from 'react-sparklines';

interface SparklineCardProps {
  title: string;
  data: number[];
  color?: string;
}

const SparklineCard: React.FC<SparklineCardProps> = ({
  title,
  data,
  color = '#a855f7',
}) => {
  return (
    <div className="radial-gradient-border border border-gray-800 rounded-xl p-6 w-[500px] min-h-[100px]">
      <div className="inner-content">
        <h2 className="text-gray-300 text-lg mb-4">{title}</h2>
        <div className="h-[60px]">
          <Sparklines data={data} width={400} height={60} margin={5}>
            <SparklinesLine
              style={{ stroke: color, strokeWidth: 2, fill: 'none' }}
            />
            <SparklinesSpots
              size={2}
              style={{ stroke: color, strokeWidth: 2, fill: 'white' }}
            />
          </Sparklines>
        </div>
      </div>
    </div>
  );
};

export default SparklineCard;
