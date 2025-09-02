#!/usr/bin/env python3

import asyncio
import logging
import os
from typing import Optional

import httpx
from web3 import Web3
from web3.types import TxParams, Wei

from utils.rofl_utility import RoflUtility

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
RPC_URL = "https://testnet.sapphire.oasis.io"
BINANCE_API_URL = "https://www.binance.com/api/v3/ticker/price"
SLEEP_INTERVAL = 60  # seconds

# Get required environment variables
_contract_address = os.getenv("CONTRACT_ADDRESS")
_ticker = os.getenv("TICKER")

# Validate required environment variables
if not _contract_address:
    raise ValueError("CONTRACT_ADDRESS environment variable is required")
if not _ticker:
    raise ValueError("TICKER environment variable is required")

# Declare typed variables after validation
CONTRACT_ADDRESS: str = _contract_address
TICKER: str = _ticker


async def fetch_price(ticker: str) -> Optional[int]:
    """Fetch price from Binance API and convert to uint128 format.
    
    Args:
        ticker: Trading pair symbol (e.g., "BTCUSDT")
        
    Returns:
        Price multiplied by 1,000,000 and truncated to integer, or None if failed
    """
    try:
        async with httpx.AsyncClient() as client:
            params = {"symbol": ticker}
            response = await client.get(BINANCE_API_URL, params=params, timeout=30.0)
            response.raise_for_status()
            
            data = response.json()
            price_float = float(data["price"])
            price_uint128 = int(price_float * 1_000_000)
            
            logger.info(f"Fetched {ticker} price: {price_float} -> {price_uint128}")
            return price_uint128
            
    except Exception as e:
        logger.error(f"Failed to fetch price for {ticker}: {e}")
        return None


def build_submit_observation_tx(w3: Web3, contract_address: str, price: int) -> TxParams:
    """Build a transaction to call submitObservation(uint128) on the Oracle contract.
    
    Args:
        w3: Web3 instance
        contract_address: Oracle contract address
        price: Price value as uint128
        
    Returns:
        Transaction parameters ready for submission
    """
    # ABI for submitObservation(uint128) function
    function_abi = {
        "inputs": [{"name": "_value", "type": "uint128"}],
        "name": "submitObservation",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
    
    # Create contract instance with minimal ABI
    contract = w3.eth.contract(
        address=contract_address,
        abi=[function_abi]
    )
    
    tx_params: TxParams = {
        'from': '0x0000000000000000000000000000000000000000', 
        'gas': 300000,
        'gasPrice': w3.eth.gas_price,
        'value': Wei(0)
    }
    
    tx_data = contract.functions.submitObservation(price).build_transaction(tx_params)
    
    logger.debug(f"Built transaction: {tx_data}")
    return tx_data


async def main():
    """Main application entry point."""
    logger.info("Starting Python ROFL price oracle")
    logger.info(f"Contract: {CONTRACT_ADDRESS}")
    logger.info(f"Ticker: {TICKER}")
    logger.info(f"RPC: {RPC_URL}")
    
    # Initialize utilities
    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    rofl_util = RoflUtility()
    
    while True:
        try:
            logger.info("Starting oracle loop iteration...")
            
            # Fetch current price from Binance
            price = await fetch_price(TICKER)
            if price is None:
                logger.warning("Failed to fetch price, skipping this iteration")
                await asyncio.sleep(15)
                continue
                
            logger.info(f"Submitting price: {price} (for {TICKER})")
            
            # Build the transaction
            tx = build_submit_observation_tx(w3, CONTRACT_ADDRESS, price)
            
            # Submit via ROFL
            success = await rofl_util.submit_tx(tx)
            if success:
                logger.info("Transaction submitted successfully via ROFL")
            else:
                logger.error("Failed to submit transaction via ROFL")
            
            await asyncio.sleep(SLEEP_INTERVAL)
            
        except KeyboardInterrupt:
            logger.info("Shutting down price oracle...")
            break
        except Exception as e:
            logger.error(f"Error in main loop: {e}")
            await asyncio.sleep(15)


if __name__ == "__main__":
    asyncio.run(main())
