import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useBalance, useReadContract, useChainId } from 'wagmi'
import React from 'react'
import { uniswapV3PoolAbi, erc20Abi } from '../../shared/abis'
import type { Abi } from 'viem'
import { mainnet } from 'viem/chains'

interface TokenInfo {
  address: `0x${string}`
  symbol: string
  name: string
  decimals: number
}

interface PoolInfo {
  token0: TokenInfo
  token1: TokenInfo
  fee: number
}

export default function Day9(): JSX.Element {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { data: balanceData, isLoading } = useBalance({ address })
  const uniswapV3poolAddress = '0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36' as `0x${string}`
  
  const isCorrectChain = chainId === mainnet.id

  const { 
    data: token0, 
    isLoading: isLoadingToken0,
    error: errorToken0 
  } = useReadContract({
    address: uniswapV3poolAddress,
    abi: uniswapV3PoolAbi as Abi,
    functionName: 'token0',
    query: {
      enabled: isCorrectChain, // 只在正确的链上查询
    },
  })

  const { 
    data: token1, 
    isLoading: isLoadingToken1,
    error: errorToken1 
  } = useReadContract({
    address: uniswapV3poolAddress,
    abi: uniswapV3PoolAbi as Abi,
    functionName: 'token1',
    query: {
      enabled: isCorrectChain,
    },
  })

  const { 
    data: fee, 
    isLoading: isLoadingFee,
    error: errorFee 
  } = useReadContract({
    address: uniswapV3poolAddress,
    abi: uniswapV3PoolAbi as Abi,
    functionName: 'fee',
    query: {
      enabled: isCorrectChain,
    },
  })

  const isLoadingPool = isLoadingToken0 || isLoadingToken1 || isLoadingFee

  // Token 0 的信息 - 只在 token0 地址存在时查询
  const { 
    data: token0Name, 
    isLoading: isLoadingToken0Name 
  } = useReadContract({
    address: token0 as `0x${string}`,
    abi: erc20Abi as Abi,
    functionName: 'name',
    query: {
      enabled: isCorrectChain && !!token0,
    },
  })

  const { 
    data: token0Symbol 
  } = useReadContract({
    address: token0 as `0x${string}`,
    abi: erc20Abi as Abi,
    functionName: 'symbol',
    query: {
      enabled: isCorrectChain && !!token0,
    },
  })

  const { 
    data: token0Decimals 
  } = useReadContract({
    address: token0 as `0x${string}`,
    abi: erc20Abi as Abi,
    functionName: 'decimals',
    query: {
      enabled: isCorrectChain && !!token0,
    },
  })

  // Token 1 的信息 - 只在 token1 地址存在时查询
  const { 
    data: token1Name 
  } = useReadContract({
    address: token1 as `0x${string}`,
    abi: erc20Abi as Abi,
    functionName: 'name',
    query: {
      enabled: isCorrectChain && !!token1,
    },
  })

  const { 
    data: token1Symbol 
  } = useReadContract({
    address: token1 as `0x${string}`,
    abi: erc20Abi as Abi,
    functionName: 'symbol',
    query: {
      enabled: isCorrectChain && !!token1,
    },
  })

  const { 
    data: token1Decimals 
  } = useReadContract({
    address: token1 as `0x${string}`,
    abi: erc20Abi as Abi,
    functionName: 'decimals',
    query: {
      enabled: isCorrectChain && !!token1,
    },
  })

  return (
    <section>
      <h2>Day 9 — Smart Contract Read</h2>

      <div style={{ marginBottom: 12 }}>
        <ConnectButton />
      </div>

      <>
        <p>
          Uniswap V3 Pool
        </p>
        <span
          style={{ marginRight: 8 }}
        >
          {token0Symbol ? String(token0Symbol) : 'Loading...'} / {token1Symbol ? String(token1Symbol) : 'Loading...'}
        </span>
        <span>{fee !== undefined ? `${Number(fee) / 10000}%` : 'N/A'}</span>
        <p>
          Contract Address: 
          <a
            href={`https://etherscan.io/address/${uniswapV3poolAddress}`}
            target="_blank" rel="noopener noreferrer"
            >
              {uniswapV3poolAddress}
          </a>
        </p>
        {!isCorrectChain && (
          <p style={{ color: 'orange', marginTop: 8 }}>
            ⚠️ 请切换到 Ethereum Mainnet 链（当前链 ID: {chainId}）
          </p>
        )}
        {isLoadingPool ? (
          <p>Loading pool info...</p>
        ) : (
          <>
            <div style={{ marginTop: 12 }}>
              <div style={{ marginBottom: 8 }}>
                <p><strong>Token 0:</strong></p>
                <p style={{ marginLeft: 16 }}>
                  Address: {token0 ? String(token0) : 'N/A'}
                  {errorToken0 && (
                    <span style={{ color: 'red', marginLeft: 8 }}>
                      (Error: {errorToken0.message})
                    </span>
                  )}
                </p>
                {token0 ? (
                  <>
                    <p style={{ marginLeft: 16 }}>
                      Name: {token0Name ? String(token0Name) : 'Loading...'}
                    </p>
                    <p style={{ marginLeft: 16 }}>
                      Symbol: {token0Symbol ? String(token0Symbol) : 'Loading...'}
                    </p>
                    <p style={{ marginLeft: 16 }}>
                      Decimals: {token0Decimals !== undefined ? String(token0Decimals) : 'Loading...'}
                    </p>
                  </>
                ) : null}
              </div>

              <div style={{ marginBottom: 8 }}>
                <p><strong>Token 1:</strong></p>
                <p style={{ marginLeft: 16 }}>
                  Address: {token1 ? String(token1) : 'N/A'}
                  {errorToken1 && (
                    <span style={{ color: 'red', marginLeft: 8 }}>
                      (Error: {errorToken1.message})
                    </span>
                  )}
                </p>
                {token1 ? (
                  <>
                    <p style={{ marginLeft: 16 }}>
                      Name: {token1Name ? String(token1Name) : 'Loading...'}
                    </p>
                    <p style={{ marginLeft: 16 }}>
                      Symbol: {token1Symbol ? String(token1Symbol) : 'Loading...'}
                    </p>
                    <p style={{ marginLeft: 16 }}>
                      Decimals: {token1Decimals !== undefined ? String(token1Decimals) : 'Loading...'}
                    </p>
                  </>
                ) : null}
              </div>

              <p>
                <strong>Fee:</strong> {fee !== undefined ? `${Number(fee) / 10000}%` : 'N/A'}
                {errorFee && (
                  <span style={{ color: 'red', marginLeft: 8 }}>
                    (Error: {errorFee.message})
                  </span>
                )}
              </p>
            </div>
          </>
        )}
      </>

      <p style={{ marginTop: 12 }}>
        This demo uses wagmi's <code>useReadContract</code> hook to read the contract data.
        <br />
        The contract data is read from the Uniswap V3 Pool contract.
        <br />
        <a href="https://app.uniswap.org/explore/pools/ethereum/0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36" target="_blank" rel="noopener noreferrer">
          https://app.uniswap.org/explore/pools/ethereum/0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36
        </a>
      </p>
    </section>
  )
}
