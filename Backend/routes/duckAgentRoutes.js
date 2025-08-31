const express = require('express');
const router = express.Router();
const duckAgentController = require('../controllers/duckAgentController');

/**
 * @swagger
 * components:
 *   schemas:
 *     DuckAgent:
 *       type: object
 *       required:
 *         - name
 *         - email
 *       properties:
 *         name:
 *           type: string
 *           description: Agent name
 *         description:
 *           type: string
 *           description: Agent description
 *         email:
 *           type: string
 *           format: email
 *           description: User email (required for DUCK agents)
 *         agentType:
 *           type: string
 *           enum: [general, trading, defi, nft]
 *           default: general
 *           description: Type of agent
 *         configuration:
 *           type: object
 *           description: Agent configuration
 *     DuckSwapRequest:
 *       type: object
 *       required:
 *         - fromToken
 *         - toToken
 *         - amount
 *       properties:
 *         fromToken:
 *           type: string
 *           description: Source token symbol (e.g., DUCK, USDC)
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
 *     DuckTransferRequest:
 *       type: object
 *       required:
 *         - token
 *         - to
 *         - amount
 *       properties:
 *         token:
 *           type: string
 *           description: Token symbol (e.g., DUCK, USDC)
 *         to:
 *           type: string
 *           description: Recipient address
 *         amount:
 *           type: number
 *           description: Amount to transfer
 */

/**
 * @swagger
 * /api/agents/duck:
 *   post:
 *     summary: Create a new DUCK agent
 *     description: Creates a new DUCK agent and automatically creates or retrieves user based on email
 *     tags: [DUCK Agents]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DuckAgent'
 *     responses:
 *       201:
 *         description: DUCK agent created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "DUCK agent created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     agent:
 *                       type: object
 *                     address:
 *                       type: string
 *                     user:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *                         duckAddress:
 *                           type: string
 *       400:
 *         description: Bad request - validation error
 *       500:
 *         description: Server error
 */
router.post('/', duckAgentController.createDuckAgent);

/**
 * @swagger
 * /api/agents/duck:
 *   get:
 *     summary: Get all DUCK agents or agents for a specific user
 *     tags: [DUCK Agents]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter agents by user ID
 *     responses:
 *       200:
 *         description: List of DUCK agents
 *       500:
 *         description: Server error
 */
router.get('/', duckAgentController.getDuckAgents);

/**
 * @swagger
 * /api/agents/duck/tokens:
 *   get:
 *     summary: Get supported tokens
 *     tags: [DUCK Agents]
 *     responses:
 *       200:
 *         description: List of supported tokens
 *       500:
 *         description: Server error
 */
router.get('/tokens', duckAgentController.getSupportedTokens);

/**
 * @swagger
 * /api/agents/duck/{id}:
 *   get:
 *     summary: Get a specific DUCK agent by ID
 *     tags: [DUCK Agents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent ID
 *     responses:
 *       200:
 *         description: DUCK agent details
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Server error
 */
router.get('/:id', duckAgentController.getDuckAgent);

/**
 * @swagger
 * /api/agents/duck/{id}:
 *   put:
 *     summary: Update a DUCK agent
 *     tags: [DUCK Agents]
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
router.put('/:id', duckAgentController.updateDuckAgent);

/**
 * @swagger
 * /api/agents/duck/{id}:
 *   delete:
 *     summary: Delete a DUCK agent
 *     tags: [DUCK Agents]
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
router.delete('/:id', duckAgentController.deleteDuckAgent);

/**
 * @swagger
 * /api/agents/duck/balance:
 *   get:
 *     summary: Get agent balance using email
 *     tags: [DUCK Agents]
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: User email address
 *         example: user@example.com
 *     responses:
 *       200:
 *         description: Agent balance information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Balance retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     duckBalance:
 *                       type: object
 *                     tokenBalances:
 *                       type: array
 *                       items:
 *                         type: object
 *                     address:
 *                       type: string
 *                     agent:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         description:
 *                           type: string
 *                         duckAddress:
 *                           type: string
 *                     user:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *       400:
 *         description: Bad request - email parameter required or invalid format
 *       404:
 *         description: User or agent not found
 *       500:
 *         description: Server error
 */
router.get('/balance', duckAgentController.getAgentBalance);

/**
 * @swagger
 * /api/agents/duck/{id}/swap:
 *   post:
 *     summary: Execute a token swap
 *     tags: [DUCK Agents]
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
 *             $ref: '#/components/schemas/DuckSwapRequest'
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
router.post('/:id/swap', duckAgentController.executeSwap);

/**
 * @swagger
 * /api/agents/duck/{id}/transfer:
 *   post:
 *     summary: Execute a token transfer
 *     tags: [DUCK Agents]
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
 *             $ref: '#/components/schemas/DuckTransferRequest'
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
router.post('/:id/transfer', duckAgentController.executeTransfer);

module.exports = router;