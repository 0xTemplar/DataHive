import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

interface TrainingStatusResponse {
  success: boolean;
  campaign_id?: string;
  status?: string;
  result_url?: string;
  started_at?: string;
  completed_at?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TrainingStatusResponse>
) {
  if (req.method !== 'GET') {
    return res
      .status(405)
      .json({ success: false, error: 'Method not allowed' });
  }

  const { status_id } = req.query;

  if (!status_id) {
    return res.status(400).json({
      success: false,
      error: 'Missing status_id parameter',
    });
  }

  try {
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'http://localhost:8000';
    const backendResponse = await axios.get(
      `${backendUrl}/training/training-status/${status_id}`
    );

    return res.status(200).json({
      success: true,
      ...backendResponse.data,
    });
  } catch (error) {
    console.error('Error fetching training status:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch training status. Please try again.',
    });
  }
}
