import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useBalance, useReadContracts, useChainId } from 'wagmi'
import { erc20Abi, formatUnits, parseUnits } from 'viem'
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

export default function Day6(): JSX.Element {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { data: balanceData } = useBalance({ address })
  const [tokens, setTokens] = useState<TokenInfo[]>([])
  const [isLoadingTokens, setIsLoadingTokens] = useState(false)
  const [fromToken, setFromToken] = useState<TokenInfo | null>(null)
  const [toToken, setToToken] = useState<TokenInfo | null>(null)
  const [fromAmount, setFromAmount] = useState<string>('')
  const [toAmount, setToAmount] = useState<string>('')
  const [slippage, setSlippage] = useState<number>(0.5)
  const [isSwapping, setIsSwapping] = useState(false)
  const [isLoadingQuote, setIsLoadingQuote] = useState(false)
  const [priceImpact, setPriceImpact] = useState<number | null>(null)
  const [exchangeRate, setExchangeRate] = useState<string | null>(null)

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

  // Get 0x API base URL based on chain
  const get0xApiBaseUrl = (chainId: number): string | null => {
    if (chainId === mainnet.id) return 'https://api.0x.org'
    if (chainId === arbitrum.id) return 'https://arbitrum.api.0x.org'
    return null
  }

  // Get 0x API headers
  const get0xApiHeaders = () => {
    const apiKey = process.env.NEXT_PUBLIC_ZERO_EX_API_KEY
    return {
      '0x-api-key': apiKey || '',
      '0x-version': 'v2',
      'Content-Type': 'application/json',
    }
  }

  // Fetch tokens from CoinGecko
  useEffect(() => {
    const platformKey = getPlatformKey(chainId)
    if (!platformKey) {
      setTokens([])
      return
    }

    const fetchTokens = async () => {
      setIsLoadingTokens(true)
      try {
        // Fetch top 100 tokens by market cap (same as Day5)
        const marketsResponse = await fetch(
          'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false'
        )
        const marketsData = await marketsResponse.json()
        const coinsListResponse = await fetch(
          'https://api.coingecko.com/api/v3/coins/list?include_platform=true'
        )
        const coinsList = await coinsListResponse.json()

        const platformsMapById = new Map<string, any>()
        const platformsMapBySymbol = new Map<string, Array<{ id: string; platforms: any; name: string }>>()

        coinsList.forEach((coin: any) => {
          if (coin.platforms) {
            platformsMapById.set(coin.id, coin.platforms)
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
                const nameMatch = coins.some(
                  (c) =>
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
                const nameMatches =
                  match.name.toLowerCase().includes(marketCoin.name.toLowerCase()) ||
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
              decimals: 18,
              logoURI: marketCoin.image,
              priceUSD: marketCoin.current_price,
            })
          }
        }

        setTokens(tokenList)
        // Set default tokens (ETH equivalent and a stablecoin)
        if (tokenList.length > 0) {
          const ethToken = tokenList.find((t) => t.symbol === 'ETH' || t.symbol === 'WETH')
          const usdcToken = tokenList.find((t) => t.symbol === 'USDC' || t.symbol === 'USDT')
          if (ethToken) setFromToken(ethToken)
          if (usdcToken) setToToken(usdcToken)
        }
      } catch (error) {
        console.error('Failed to fetch tokens:', error)
      } finally {
        setIsLoadingTokens(false)
      }
    }

    fetchTokens()
  }, [chainId])

  // Calculate swap rate using 0x API (with CoinGecko fallback)
  useEffect(() => {
    let cancelled = false

    const calculateQuote = async () => {
      if (!fromToken || !toToken || !fromAmount || parseFloat(fromAmount) <= 0) {
        setToAmount('')
        setPriceImpact(null)
        setExchangeRate(null)
        return
      }

      setIsLoadingQuote(true)

      // Try 0x API first
      const baseUrl = get0xApiBaseUrl(chainId)
      if (baseUrl && fromToken.address && toToken.address) {
        try {
          // For native ETH, use WETH address for 0x API
          const sellToken = fromToken.symbol === 'ETH' ? 'ETH' : fromToken.address
          const buyToken = toToken.symbol === 'ETH' ? 'ETH' : toToken.address

          const sellAmountWei = parseUnits(fromAmount, fromToken.decimals).toString()
          const params = new URLSearchParams({
            sellToken,
            buyToken,
            sellAmount: sellAmountWei,
            slippagePercentage: slippage.toString(),
          })

          const headers = get0xApiHeaders()
          const response = await fetch(`${baseUrl}/swap/v1/quote?${params.toString()}`, {
            headers,
          })
          if (response.ok) {
            const data = await response.json()
            if (!cancelled) {
              const buyAmount = formatUnits(BigInt(data.buyAmount), toToken.decimals)
              setToAmount(parseFloat(buyAmount).toFixed(6))
              
              // Calculate price impact
              if (data.estimatedPriceImpact) {
                setPriceImpact(parseFloat(data.estimatedPriceImpact) * 100)
              } else {
                setPriceImpact(null)
              }

              // Calculate exchange rate
              const rate = parseFloat(buyAmount) / parseFloat(fromAmount)
              setExchangeRate(rate.toFixed(6))
            }
            setIsLoadingQuote(false)
            return
          }
        } catch (error) {
          console.error('0x API error, falling back to CoinGecko:', error)
        }
      }

      // Fallback to CoinGecko price ratio
      if (!cancelled) {
        if (fromToken.priceUSD && toToken.priceUSD) {
          const fromValue = parseFloat(fromAmount) * fromToken.priceUSD
          const toValue = fromValue / toToken.priceUSD
          const slippageAdjusted = toValue * (1 - slippage / 100)
          setToAmount(slippageAdjusted.toFixed(6))
          
          // Estimate price impact (very rough estimate)
          setPriceImpact(0.01)
          
          // Calculate exchange rate
          const rate = slippageAdjusted / parseFloat(fromAmount)
          setExchangeRate(rate.toFixed(6))
        } else {
          setToAmount('')
          setPriceImpact(null)
          setExchangeRate(null)
        }
        setIsLoadingQuote(false)
      }
    }

    calculateQuote()

    return () => {
      cancelled = true
    }
  }, [fromToken, toToken, fromAmount, slippage, chainId])

  // Get token balance
  const tokenBalanceContracts = useMemo(() => {
    if (!address || !fromToken) return []
    return [
      {
        address: fromToken.address,
        abi: erc20Abi,
        functionName: 'balanceOf' as const,
        args: [address],
      },
      {
        address: fromToken.address,
        abi: erc20Abi,
        functionName: 'decimals' as const,
      },
    ]
  }, [address, fromToken])

  const { data: tokenBalanceData } = useReadContracts({
    contracts: tokenBalanceContracts,
    query: {
      enabled: isConnected && !!address && !!fromToken && getPlatformKey(chainId) !== null,
    },
  })

  const fromTokenBalance = useMemo(() => {
    if (!tokenBalanceData || !fromToken) return null
    const balanceResult = tokenBalanceData[0]
    const decimalsResult = tokenBalanceData[1]
    if (balanceResult?.status === 'success' && decimalsResult?.status === 'success') {
      const balance = balanceResult.result as bigint
      const decimals = Number(decimalsResult.result)
      return formatUnits(balance, decimals)
    }
    return null
  }, [tokenBalanceData, fromToken])

  // Handle swap
  const handleSwap = async () => {
    if (!fromToken || !toToken || !fromAmount || parseFloat(fromAmount) <= 0) return

    setIsSwapping(true)
    // Simulate swap transaction
    await new Promise((resolve) => setTimeout(resolve, 2000))
    alert(
      `Swap simulated: ${fromAmount} ${fromToken.symbol} → ${toAmount} ${toToken.symbol}\n\nThis is a simulation. No actual transaction was sent.`
    )
    setIsSwapping(false)
  }

  // Swap tokens (reverse from/to)
  const handleReverseSwap = () => {
    const tempToken = fromToken
    const tempAmount = fromAmount
    setFromToken(toToken)
    setToToken(tempToken)
    setFromAmount(toAmount)
    setToAmount(tempAmount)
  }

  // Set max amount
  const handleSetMax = () => {
    if (fromTokenBalance) {
      setFromAmount(fromTokenBalance)
    } else if (fromToken?.symbol === 'ETH' && balanceData) {
      // For ETH, use native balance minus gas estimate
      const ethBalance = parseFloat(balanceData.formatted)
      const maxAmount = Math.max(0, ethBalance - 0.01) // Reserve 0.01 ETH for gas
      setFromAmount(maxAmount.toString())
    }
  }

  return (
    <section>
      <h2>Day 6 — Token Swap UI</h2>

      <div style={{ marginBottom: 12 }}>
        <ConnectButton />
      </div>

      {isConnected ? (
        <>
          <p>
            <strong>Address:</strong> {address}
          </p>
          <p>
            <strong>Chain:</strong> {getChainName(chainId)}
          </p>

          {getPlatformKey(chainId) === null ? (
            <p style={{ color: 'orange', marginTop: 12 }}>
              Token swap is only available on Ethereum Mainnet or Arbitrum. Please switch to a supported network.
            </p>
          ) : (
            <div style={{ marginTop: 24, maxWidth: '500px' }}>
              {isLoadingTokens ? (
                <p>Loading tokens...</p>
              ) : (
                <>
                  {/* From Token */}
                  <div
                    style={{
                      border: '1px solid #e0e0e0',
                      borderRadius: '12px',
                      padding: '16px',
                      marginBottom: '12px',
                      backgroundColor: '#f9f9f9',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}>From</label>
                      {fromTokenBalance && (
                        <span style={{ fontSize: '12px', color: '#888' }}>
                          Balance: {parseFloat(fromTokenBalance).toFixed(6)} {fromToken?.symbol}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="0.0"
                        value={fromAmount}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            setFromAmount(value)
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: '12px',
                          fontSize: '18px',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          outline: 'none',
                        }}
                      />
                      <button
                        onClick={handleSetMax}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          backgroundColor: '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        MAX
                      </button>
                      <select
                        value={fromToken?.address || ''}
                        onChange={(e) => {
                          const token = tokens.find((t) => t.address === e.target.value)
                          setFromToken(token || null)
                        }}
                        style={{
                          padding: '12px',
                          fontSize: '14px',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          minWidth: '150px',
                          outline: 'none',
                        }}
                      >
                        <option value="">Select token</option>
                        {tokens.map((token) => (
                          <option key={token.address} value={token.address}>
                            {token.symbol} - {token.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Swap Button */}
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
                    <button
                      onClick={handleReverseSwap}
                      style={{
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '50%',
                        backgroundColor: '#fff',
                        cursor: 'pointer',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                      }}
                    >
                      ⇅
                    </button>
                  </div>

                  {/* To Token */}
                  <div
                    style={{
                      border: '1px solid #e0e0e0',
                      borderRadius: '12px',
                      padding: '16px',
                      marginBottom: '12px',
                      backgroundColor: '#f9f9f9',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}>To</label>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder={isLoadingQuote ? 'Loading...' : '0.0'}
                        value={isLoadingQuote ? '' : toAmount}
                        readOnly
                        style={{
                          flex: 1,
                          padding: '12px',
                          fontSize: '18px',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          backgroundColor: '#f5f5f5',
                          color: isLoadingQuote ? '#999' : '#666',
                        }}
                      />
                      <select
                        value={toToken?.address || ''}
                        onChange={(e) => {
                          const token = tokens.find((t) => t.address === e.target.value)
                          setToToken(token || null)
                        }}
                        style={{
                          padding: '12px',
                          fontSize: '14px',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          minWidth: '150px',
                          outline: 'none',
                        }}
                      >
                        <option value="">Select token</option>
                        {tokens.map((token) => (
                          <option key={token.address} value={token.address}>
                            {token.symbol} - {token.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Slippage Settings */}
                  <div
                    style={{
                      border: '1px solid #e0e0e0',
                      borderRadius: '12px',
                      padding: '12px',
                      marginBottom: '16px',
                      backgroundColor: '#f9f9f9',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}>Slippage Tolerance</label>
                      <span style={{ fontSize: '14px', color: '#333', fontWeight: '500' }}>{slippage}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="5"
                      step="0.1"
                      value={slippage}
                      onChange={(e) => setSlippage(parseFloat(e.target.value))}
                      style={{ width: '100%' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888', marginTop: '4px' }}>
                      <span>0.1%</span>
                      <span>5%</span>
                    </div>
                  </div>

                  {/* Swap Info */}
                  {fromToken && toToken && fromAmount && parseFloat(fromAmount) > 0 && (
                    <div
                      style={{
                        border: '1px solid #e0e0e0',
                        borderRadius: '12px',
                        padding: '12px',
                        marginBottom: '16px',
                        backgroundColor: '#f0f8ff',
                        fontSize: '14px',
                      }}
                    >
                      {isLoadingQuote ? (
                        <div style={{ textAlign: 'center', color: '#666', padding: '8px' }}>
                          Loading quote...
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ color: '#666' }}>Exchange Rate:</span>
                            <span style={{ fontWeight: '500' }}>
                              {exchangeRate ? (
                                <>
                                  1 {fromToken.symbol} = {exchangeRate} {toToken.symbol}
                                </>
                              ) : fromToken.priceUSD && toToken.priceUSD ? (
                                <>
                                  1 {fromToken.symbol} = {(fromToken.priceUSD / toToken.priceUSD).toFixed(6)}{' '}
                                  {toToken.symbol} <span style={{ fontSize: '12px', color: '#888' }}>(market)</span>
                                </>
                              ) : (
                                '—'
                              )}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ color: '#666' }}>Minimum Received:</span>
                            <span style={{ fontWeight: '500' }}>
                              {toAmount ? `${toAmount} ${toToken.symbol}` : '—'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#666' }}>Price Impact:</span>
                            <span
                              style={{
                                fontWeight: '500',
                                color:
                                  priceImpact === null
                                    ? '#888'
                                    : priceImpact < 1
                                      ? '#28a745'
                                      : priceImpact < 3
                                        ? '#ffc107'
                                        : '#dc3545',
                              }}
                            >
                              {priceImpact !== null
                                ? `${priceImpact.toFixed(2)}%`
                                : exchangeRate
                                  ? '~0.01%'
                                  : '—'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Swap Button */}
                  <button
                    onClick={handleSwap}
                    disabled={!fromToken || !toToken || !fromAmount || parseFloat(fromAmount) <= 0 || isSwapping}
                    style={{
                      width: '100%',
                      padding: '16px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: '#fff',
                      backgroundColor:
                        !fromToken || !toToken || !fromAmount || parseFloat(fromAmount) <= 0 || isSwapping
                          ? '#ccc'
                          : '#007bff',
                      border: 'none',
                      borderRadius: '12px',
                      cursor:
                        !fromToken || !toToken || !fromAmount || parseFloat(fromAmount) <= 0 || isSwapping
                          ? 'not-allowed'
                          : 'pointer',
                    }}
                  >
                    {isSwapping ? 'Swapping...' : 'Swap'}
                  </button>
                </>
              )}
            </div>
          )}
        </>
      ) : (
        <p>Not connected. Use the Connect button above to connect a wallet.</p>
      )}

      <p style={{ marginTop: 12 }}>
        This demo simulates a token swap UI. You can select tokens, enter amounts, adjust slippage tolerance, and
        simulate a swap. No actual transactions are sent. Exchange rates are calculated based on current token prices
        from 0x API.
      </p>
    </section>
  )
}

