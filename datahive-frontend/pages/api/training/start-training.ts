import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

interface TrainingRequest {
  on_chain_campaign_id: string;
  target_column: string;
  feature_columns: string[];
  training_type: 'classification' | 'regression';
}

interface TrainingResponse {
  success: boolean;
  message?: string;
  training_status_id?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TrainingResponse>
) {
  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({ success: false, error: 'Method not allowed' });
  }

  try {
    const {
      on_chain_campaign_id,
      target_column,
      feature_columns,
      training_type,
    } = req.body as TrainingRequest;

    // Validate request body
    if (
      !on_chain_campaign_id ||
      !target_column ||
      !feature_columns ||
      !training_type
    ) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    // Forward the request to the backend
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'http://localhost:8000';
    const backendResponse = await axios.post(
      `${backendUrl}/training/start-training`,
      {
        on_chain_campaign_id,
        target_column,
        feature_columns,
        training_type,
      }
    );

    // Return the response from the backend with the training_status_id
    return res.status(200).json({
      success: true,
      message: backendResponse.data.message,
      training_status_id: backendResponse.data.training_status_id,
    });
  } catch (error) {
    console.error('Training error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to start training. Please try again.',
    });
  }
}
