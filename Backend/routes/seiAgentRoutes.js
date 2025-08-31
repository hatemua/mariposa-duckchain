const express = require('express');
const router = express.Router();
const seiAgentController = require('../controllers/seiAgentController');

/**
 * @swagger
 * components:
 *   schemas:
 *     SeiAgent:
 *       type: object
 *       required:
 *         - name
 *         - userId
 *       properties:
 *         name:
 *           type: string
 *           description: Agent name
 *         description:
 *           type: string
 *           description: Agent description
 *         userId:
 *           type: string
 *           description: User ID who owns the agent
 *         agentType:
 *           type: string
 *           enum: [general, trading, defi, nft]
 *           default: general
 *           description: Type of agent
 *         configuration:
 *           type: object
 *           description: Agent configuration
 *     SwapRequest:
 *       type: object
 *       required:
 *         - fromToken
 *         - toToken
 *         - amount
 *       properties:
 *         fromToken:
 *           type: string
 *           description: Source token symbol (e.g., SEI, USDC)
 *         toToken:
 *           type: string
 *           description: Target token symbol (e.g., USDC, WETH)
 *         amount:
 *           type: number
 *           description: Amount to swap
 *         slippageTolerance:
 *           type: number
 *           default: 15
 *           description: Slippage tolerance percentage
 *     TransferRequest:
 *       type: object
 *       required:
 *         - token
 *         - to
 *         - amount
 *       properties:
 *         token:
 *           type: string
 *           description: Token symbol (e.g., SEI, USDC)
 *         to:
 *           type: string
 *           description: Recipient address
 *         amount:
 *           type: number
 *           description: Amount to transfer
 */

/**
 * @swagger
 * /api/agents/sei:
 *   post:
 *     summary: Create a new SEI agent
 *     tags: [SEI Agents]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SeiAgent'
 *     responses:
 *       201:
 *         description: SEI agent created successfully
 *       400:
 *         description: Bad request - validation error
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post('/', seiAgentController.createSeiAgent);

/**
 * @swagger
 * /api/agents/sei:
 *   get:
 *     summary: Get all SEI agents or agents for a specific user
 *     tags: [SEI Agents]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter agents by user ID
 *     responses:
 *       200:
 *         description: List of SEI agents
 *       500:
 *         description: Server error
 */
router.get('/', seiAgentController.getSeiAgents);

/**
 * @swagger
 * /api/agents/sei/tokens:
 *   get:
 *     summary: Get supported tokens
 *     tags: [SEI Agents]
 *     responses:
 *       200:
 *         description: List of supported tokens
 *       500:
 *         description: Server error
 */
router.get('/tokens', seiAgentController.getSupportedTokens);

/**
 * @swagger
 * /api/agents/sei/{id}:
 *   get:
 *     summary: Get a specific SEI agent by ID
 *     tags: [SEI Agents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent ID
 *     responses:
 *       200:
 *         description: SEI agent details
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Server error
 */
router.get('/:id', seiAgentController.getSeiAgent);

/**
 * @swagger
 * /api/agents/sei/{id}:
 *   put:
 *     summary: Update a SEI agent
 *     tags: [SEI Agents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               configuration:
 *                 type: object
 *     responses:
 *       200:
 *         description: Agent updated successfully
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Server error
 */
router.put('/:id', seiAgentController.updateSeiAgent);

/**
 * @swagger
 * /api/agents/sei/{id}:
 *   delete:
 *     summary: Delete a SEI agent
 *     tags: [SEI Agents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent ID
 *     responses:
 *       200:
 *         description: Agent deleted successfully
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', seiAgentController.deleteSeiAgent);

/**
 * @swagger
 * /api/agents/sei/{id}/balance:
 *   get:
 *     summary: Get agent balance
 *     tags: [SEI Agents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent ID
 *     responses:
 *       200:
 *         description: Agent balance information
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Server error
 */
router.get('/:id/balance', seiAgentController.getAgentBalance);

/**
 * @swagger
 * /api/agents/sei/{id}/swap:
 *   post:
 *     summary: Execute a token swap
 *     tags: [SEI Agents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SwapRequest'
 *     responses:
 *       200:
 *         description: Swap executed successfully
 *       400:
 *         description: Bad request - validation error
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Server error
 */
router.post('/:id/swap', seiAgentController.executeSwap);

/**
 * @swagger
 * /api/agents/sei/{id}/transfer:
 *   post:
 *     summary: Execute a token transfer
 *     tags: [SEI Agents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TransferRequest'
 *     responses:
 *       200:
 *         description: Transfer executed successfully
 *       400:
 *         description: Bad request - validation error
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Server error
 */
router.post('/:id/transfer', seiAgentController.executeTransfer);

module.exports = router;
