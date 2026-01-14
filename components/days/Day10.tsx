import { ConnectButton } from '@rainbow-me/rainbowkit'
import {
  useAccount,
  useBalance,
  useChainId,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi'
import React from 'react'
import { erc20Abi, parseUnits } from 'viem'

export default function Day10(): JSX.Element {
  const { address, isConnected } = useAccount()
  const { data: balanceData, isLoading } = useBalance({ address })
  const chainId = useChainId()
  const uniswapV3RouterAddress = {
    mainnet: '0x66a9893cC07D91D95644AEDD05D03f95e1dBA8Af',
    arbitrum: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  }
  const usdcAddress = {
    mainnet: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  }

  // 获取当前链的地址
  const currentUsdcAddress = chainId === 1
    ? usdcAddress.mainnet
    : chainId === 42161
    ? usdcAddress.arbitrum
    : null

  const currentRouterAddress = chainId === 1
    ? uniswapV3RouterAddress.mainnet
    : chainId === 42161
    ? uniswapV3RouterAddress.arbitrum
    : null

  // 使用 useWriteContract hook 来写合约
  const {
    writeContract,
    data: hash,
    isPending: isApproving,
    error: approveError,
  } = useWriteContract()

  // 等待交易确认
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    })

  const handleApproveUSDC = () => {
    if (!currentUsdcAddress || !currentRouterAddress) {
      alert('Unsupported chain')
      return
    }

    // 1 USDC = 1 * 10^6 (USDC 有 6 位小数)
    const amount = parseUnits('1', 6)

    writeContract({
      address: currentUsdcAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: 'approve',
      args: [currentRouterAddress as `0x${string}`, amount],
    })
  }

  return (
    <section>
      <h2>Day 10 — Smart Contract Write</h2>

      <div style={{ marginBottom: 12 }}>
        <ConnectButton />
      </div>

      {isConnected ? (
        <>
          <p>Approve USDC for Uniswap Router</p>
          <p>Approve 1 USDC for Uniswap Router</p>
          <p>Uniswap Swap Router Address:{currentRouterAddress || 'N/A (Unsupported chain)'}</p>
          <p>USDC Address:{currentUsdcAddress || 'N/A (Unsupported chain)'}</p>
          <button
            onClick={handleApproveUSDC}
            disabled={isApproving || isConfirming || !currentUsdcAddress || !currentRouterAddress}
          >
            {isApproving
              ? 'Approving...'
              : isConfirming
              ? 'Confirming...'
              : 'Approve 1 USDC'}
          </button>
          {approveError && (
            <p style={{ color: 'red', marginTop: 8 }}>
              Error: {approveError.message}
            </p>
          )}
          {hash && (
            <p style={{ marginTop: 8 }}>
              Transaction Hash:{' '}
              <a
                href={
                  chainId === 1
                    ? `https://etherscan.io/tx/${hash}`
                    : chainId === 42161
                    ? `https://arbiscan.io/tx/${hash}`
                    : '#'
                }
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#007bff' }}
              >
                {hash}
              </a>
            </p>
          )}
          {isConfirmed && (
            <p style={{ color: 'green', marginTop: 8 }}>
              ✓ Approval confirmed!
            </p>
          )}
        </>
      ) : (
        <p>Not connected. Use the Connect button above to connect a wallet.</p>
      )}

      <p style={{ marginTop: 12 }}>
        This demo uses RainbowKit's <code>ConnectButton</code> with wagmi.
      </p>
    </section>
  )
}
