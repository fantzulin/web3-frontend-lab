import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useBalance, useReadContracts, useChainId } from 'wagmi'
import { erc20Abi, formatUnits } from 'viem'
import { mainnet, arbitrum } from 'viem/chains'
import React, { useState, useEffect, useMemo } from 'react'

interface TokenInfo {
  address: `0x${string}`
  symbol: string
  name: string
  decimals: number
  logoURI?: string
  priceUSD?: number
}

export default function Day5(): JSX.Element {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { data: balanceData, isLoading: isLoadingETH } = useBalance({ address })
  const [topTokens, setTopTokens] = useState<TokenInfo[]>([])
  const [isLoadingTokens, setIsLoadingTokens] = useState(false)

  // Get platform key based on chain
  const getPlatformKey = (chainId: number): string | null => {
    if (chainId === mainnet.id) return 'ethereum'
    if (chainId === arbitrum.id) return 'arbitrum-one'
    return null
  }

  // Get chain name for display
  const getChainName = (chainId: number): string => {
    if (chainId === mainnet.id) return 'Ethereum'
    if (chainId === arbitrum.id) return 'Arbitrum'
    return 'Unknown'
  }

  // Fetch top 100 tokens from CoinGecko (Ethereum and Arbitrum)
  useEffect(() => {
    const platformKey = getPlatformKey(chainId)
    if (!platformKey) {
      setTopTokens([])
      return
    }

    const fetchTopTokens = async () => {
      setIsLoadingTokens(true)
      try {
        // Step 1: Fetch top 100 tokens by market cap to get coin IDs and basic info
        const marketsResponse = await fetch(
          'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false'
        )
        const marketsData = await marketsResponse.json()
        // Step 2: Fetch coins list with platform addresses
        // This endpoint includes platforms information for all coins
        const coinsListResponse = await fetch(
          'https://api.coingecko.com/api/v3/coins/list?include_platform=true'
        )
        const coinsList = await coinsListResponse.json()
        // Create maps for matching
        const platformsMapById = new Map<string, any>() // coin.id -> platforms
        const platformsMapBySymbol = new Map<string, Array<{ id: string; platforms: any; name: string }>>() // symbol -> array of coins
        
        coinsList.forEach((coin: any) => {
          if (coin.platforms) {
            platformsMapById.set(coin.id, coin.platforms)
            
            // Also index by symbol for fallback matching
            const symbol = coin.symbol.toLowerCase()
            if (!platformsMapBySymbol.has(symbol)) {
              platformsMapBySymbol.set(symbol, [])
            }
            platformsMapBySymbol.get(symbol)!.push({
              id: coin.id,
              platforms: coin.platforms,
              name: coin.name,
            })
          }
        })
        
        // Get token contract addresses for the current chain
        const tokenList: TokenInfo[] = []
        for (const marketCoin of marketsData) {
          // First try to match by coin.id (most reliable)
          let platforms = platformsMapById.get(marketCoin.id)
          let contractAddress = platforms?.[platformKey]
          
          // If not found by ID, try to match by symbol (handle symbol variations)
          if (!contractAddress) {
            const marketSymbol = marketCoin.symbol.toLowerCase()
            
            // Try exact symbol match first
            const symbolMatches = platformsMapBySymbol.get(marketSymbol) || []
            
            // If no exact match, try variations (e.g., "usde" -> "usdc.e")
            let allMatches = [...symbolMatches]
            if (symbolMatches.length === 0) {
              // Try common variations
              for (const [symbol, coins] of platformsMapBySymbol.entries()) {
                // Check if symbol is a variation (e.g., usdc.e contains usdc)
                if (symbol.includes(marketSymbol) || marketSymbol.includes(symbol)) {
                  allMatches.push(...coins)
                }
                // Also check if market coin name matches coin name
                const nameMatch = coins.some(c => 
                  c.name.toLowerCase().includes(marketCoin.name.toLowerCase()) ||
                  marketCoin.name.toLowerCase().includes(c.name.toLowerCase())
                )
                if (nameMatch) {
                  allMatches.push(...coins)
                }
              }
            }
            
            // Find the best match that has the platform address
            for (const match of allMatches) {
              const altAddress = match.platforms?.[platformKey]
              if (altAddress) {
                // Prefer matches where name also matches (for bridged tokens)
                const nameMatches = match.name.toLowerCase().includes(marketCoin.name.toLowerCase()) ||
                                   marketCoin.name.toLowerCase().includes(match.name.toLowerCase())
                if (nameMatches || !contractAddress) {
                  platforms = match.platforms
                  contractAddress = altAddress
                  // If name matches, this is likely the correct one
                  if (nameMatches) break
                }
              }
            }
          }
          
          if (contractAddress) {
            tokenList.push({
              address: contractAddress.toLowerCase() as `0x${string}`,
              symbol: marketCoin.symbol.toUpperCase(),
              name: marketCoin.name,
              decimals: 18, // Default, will be fetched if needed
              logoURI: marketCoin.image,
              priceUSD: marketCoin.current_price, // Save price from markets API
            })
          }
        }
        
        setTopTokens(tokenList)
      } catch (error) {
        console.error('Failed to fetch top tokens:', error)
      } finally {
        setIsLoadingTokens(false)
      }
    }

    fetchTopTokens()
  }, [chainId])

  // Prepare contracts for batch reading balances and decimals
  const contracts = useMemo(() => {
    if (!address || topTokens.length === 0) return []
    const contractCalls = []
    for (const token of topTokens) {
      // Balance query
      contractCalls.push({
        address: token.address,
        abi: erc20Abi,
        functionName: 'balanceOf' as const,
        args: [address],
      })
      // Decimals query
      contractCalls.push({
        address: token.address,
        abi: erc20Abi,
        functionName: 'decimals' as const,
      })
    }
    return contractCalls
  }, [address, topTokens])

  // Batch read token balances and decimals
  const { data: balancesData, isLoading: isLoadingBalances } = useReadContracts({
    contracts,
    query: {
      enabled: isConnected && !!address && topTokens.length > 0 && getPlatformKey(chainId) !== null,
    },
  })

  // Combine token info with balances
  const tokenBalances = useMemo(() => {
    if (!balancesData || topTokens.length === 0) return []

    return topTokens
      .map((token, index) => {
        const balanceIndex = index * 2
        const decimalsIndex = index * 2 + 1
        
        const balanceResult = balancesData[balanceIndex]
        const decimalsResult = balancesData[decimalsIndex]
        
        // Get actual decimals from contract, fallback to default
        const decimals = decimalsResult?.status === 'success' && decimalsResult.result
          ? Number(decimalsResult.result)
          : token.decimals

        if (balanceResult?.status === 'success' && balanceResult.result) {
          const balance = balanceResult.result as bigint
          const formattedBalance = formatUnits(balance, decimals)
          const balanceNumber = parseFloat(formattedBalance)

          if (balanceNumber > 0) {
            // Calculate USD value
            const usdValue = token.priceUSD ? balanceNumber * token.priceUSD : null
            
            return {
              ...token,
              decimals,
              balance: balanceNumber,
              formattedBalance,
              usdValue,
            }
          }
        }
        return null
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.balance - a.balance) // Sort by balance descending
  }, [balancesData, topTokens])

  return (
    <section>
      <h2>Day 5 — Token List Viewer</h2>

      <div style={{ marginBottom: 12 }}>
        <ConnectButton />
      </div>

      {isConnected ? (
        <>
          <p>
            <strong>Address:</strong> {address}
          </p>
          <p>
            <strong>ETH Balance:</strong>{' '}
            {isLoadingETH ? 'Loading...' : `${balanceData?.formatted ?? '—'} ${balanceData?.symbol ?? ''}`}
          </p>

          {getPlatformKey(chainId) === null ? (
            <p style={{ color: 'orange', marginTop: 12 }}>
              Token list viewer is only available on Ethereum Mainnet or Arbitrum. Please switch to a supported network.
            </p>
          ) : (
            <>
              {isLoadingTokens || isLoadingBalances ? (
                <p style={{ marginTop: 12 }}>Loading token balances...</p>
              ) : tokenBalances.length === 0 ? (
                <p style={{ marginTop: 12 }}>
                  No token balances found in top 100 tokens on {getChainName(chainId)}.
                </p>
              ) : (
                <div style={{ marginTop: 16 }}>
                  <h3 style={{ marginBottom: 12 }}>
                    Token Balances on {getChainName(chainId)} (Top 100 by Market Cap)
                  </h3>
                  <div
                    style={{
                      display: 'grid',
                      gap: '12px',
                      maxHeight: '400px',
                      overflowY: 'auto',
                      padding: '8px',
                    }}
                  >
                    {tokenBalances.map((token) => (
                      <div
                        key={token.address}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px',
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                          backgroundColor: '#f9f9f9',
                        }}
                      >
                        {token.logoURI && (
                          <img
                            src={token.logoURI}
                            alt={token.symbol}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                            }}
                          />
                        )}
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontWeight: 'bold' }}>
                            {token.name} ({token.symbol})
                          </p>
                          <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                            {token.formattedBalance} {token.symbol}
                            {token.usdValue !== null && token.usdValue !== undefined && (
                              <span style={{ marginLeft: '8px', color: '#888' }}>
                                (${token.usdValue.toFixed(2)})
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <p>Not connected. Use the Connect button above to connect a wallet.</p>
      )}

      <p style={{ marginTop: 12 }}>
        This demo displays ERC-20 token balances from the top 100 tokens by market cap.
        Only tokens with non-zero balances are shown. Supports Ethereum Mainnet and Arbitrum.
      </p>
    </section>
  )
}
