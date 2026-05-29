# I-REC API Integration Research

## Overview
This document outlines the Level 3 product roadmap integration for bridging SolarProof certificates to the I-REC (International REC Standard) registry.

## I-REC API Capabilities
- **Authentication**: OAuth 2.0 based authentication using client credentials.
- **Issuance**: APIs to issue I-RECs based on metered generation (corresponds to SolarProof's minting).
- **Retirement**: APIs to retire I-RECs on behalf of beneficiaries.

## Bridge Design
We will implement an API Adapter in the `apps/web` layer rather than an on-chain smart contract, because the I-REC registry is off-chain and requires authenticated REST API calls. 

1. **Minting/Issuance**: When certificates are minted on SolarProof, they remain local until bridged.
2. **Retirement Trigger**: When a user retires a certificate on SolarProof (`/api/certificates/[id]/retire`), a webhook or asynchronous job will trigger the I-REC API to retire an equivalent number of I-RECs if the bridging is enabled for that certificate.

## Proof-of-Concept Implementation
A placeholder API adapter has been added to `apps/web/src/lib/irec-bridge.ts` to demonstrate how the retirement payload will be structured and dispatched.
