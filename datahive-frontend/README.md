# DataHive Frontend

## Overview

DataHive is a decentralized data collection and curation platform built on the blockchain. This frontend application provides a user interface for creating campaigns, submitting data contributions, verifying submissions, and managing reputation within the DataHive ecosystem.

## Features

- **Campaign Management**: Create, browse, and manage data collection campaigns
- **Data Submission**: Submit data contributions to active campaigns
- **Verification System**: Quality control mechanism for submitted data
- **Reputation System**: Track contributor and verifier reputation
- **Subscription Management**: Handle user subscriptions for platform services
- **Blockchain Integration**: Seamless interaction with Aptos blockchain

## Technology Stack

- **Framework**: Next.js 14.2.1
- **UI**: React 18, Tailwind CSS
- **Blockchain**: Aptos (via @aptos-labs/ts-sdk and @aptos-labs/wallet-adapter-react)
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **File Storage**: Pinata IPFS (for metadata and contribution data)

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- An EVM-compatible wallet browser extension (e.g., MetaMask)

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd datahive-frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up environment variables:
   Create a `.env.local` file based on the `.env` template with the following variables:

   ```
   NEXT_PUBLIC_CAMPAIGN_MANAGER_ADDRESS=<campaign-manager-module-address>
   NEXT_PUBLIC_NODE_URL=<aptos-network-url>
   NEXT_PUBLIC_PINATA_API_KEY=<your-pinata-api-key>
   NEXT_PUBLIC_PINATA_SECRET_API_KEY=<your-pinata-secret-key>
   NEXT_PUBLIC_BACKEND_BASE_URL=<backend-url>
   NEXT_PUBLIC_IS_TESTNET=true/false
   ```

4. Start the development server:

   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Routes

The application provides the following API routes:

### Campaign APIs

- **GET /api/campaign/getCampaignContributions**: Fetches contributions for a specific campaign
- **GET /api/campaign/getUserReputation**: Retrieves a user's reputation score
- **GET /api/campaign/getRemainingBudget**: Gets the remaining budget for a campaign

### Submission APIs

- **POST /api/submission/uploadToIpfs**: Uploads submission data to IPFS
- **POST /api/submission/encryptSubmission**: Encrypts submission data for privacy

### Reputation APIs

- **GET /api/reputation/getUserReputation**: Gets a user's reputation score
- **GET /api/reputation/getTopContributors**: Retrieves top contributors by reputation

### Subscription APIs

- **POST /api/subscription/create**: Creates a new subscription
- **GET /api/subscription/status**: Checks subscription status
- **POST /api/subscription/verify**: Verifies subscription validity

### Admin APIs

- **POST /api/admin/verifySubmission**: Admin-only endpoint to verify submissions
- **GET /api/admin/dashboardStats**: Gets dashboard statistics

## Blockchain Integration

## Deployment

### Build for Production

```bash
npm run build
# or
yarn build
```

### Start Production Server

```bash
npm run start
# or
yarn start
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

[MIT](LICENSE)
