import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coins, Wallet, Star, Zap, Users, TrendingUp, Shield, Gift } from "lucide-react";

export default function BlockchainFeatures() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [userBalance, setUserBalance] = useState({ cirq: 2847, nft: 3, eth: 0.45 });

  const nftRewards = [
    {
      id: "loyalty-gold",
      name: "Gold Status NFT",
      rarity: "Legendary",
      image: "🏆",
      description: "Exclusive Gold tier membership with lifetime benefits",
      holders: 234,
      benefits: ["5x point multiplier", "VIP events access", "Priority support"],
      value: "0.12 ETH"
    },
    {
      id: "coffee-streak",
      name: "Coffee Streak Master",
      rarity: "Epic", 
      image: "☕",
      description: "50-day coffee shop visit streak achievement",
      holders: 89,
      benefits: ["Free daily coffee", "Streak protection", "Social bragging rights"],
      value: "0.08 ETH"
    },
    {
      id: "viral-champion",
      name: "Viral Campaign Champion",
      rarity: "Rare",
      image: "🚀",
      description: "Successfully launched a campaign with 10K+ reach",
      holders: 156,
      benefits: ["Campaign boost credits", "Analytics pro access", "Marketing tools"],
      value: "0.05 ETH"
    }
  ];

  const tokenomics = {
    cirqToken: {
      name: "CIRQ Token",
      symbol: "CIRQ",
      totalSupply: "100,000,000",
      circulating: "45,000,000",
      price: "$0.24",
      marketCap: "$10.8M",
      utilities: [
        "Governance voting rights",
        "Premium feature access",
        "Staking rewards (12% APY)",
        "NFT marketplace currency",
        "Transaction fee discounts"
      ]
    },
    staking: {
      totalStaked: "12,000,000",
      apr: "12%",
      rewards: "1,440,000",
      stakingPools: [
        { name: "30-day Pool", apr: "8%", locked: "2.4M CIRQ" },
        { name: "90-day Pool", apr: "12%", locked: "4.8M CIRQ" },
        { name: "365-day Pool", apr: "18%", locked: "4.8M CIRQ" }
      ]
    }
  };

  const daoGovernance = {
    proposals: [
      {
        id: 1,
        title: "Increase Referral Rewards to $7",
        description: "Boost viral growth by increasing friend referral bonus",
        status: "Active",
        votes: { for: 8234, against: 1567 },
        timeLeft: "5 days",
        quorum: "15,000"
      },
      {
        id: 2,
        title: "Launch European Expansion",
        description: "Allocate 2M CIRQ for EU market expansion",
        status: "Passed",
        votes: { for: 12456, against: 2341 },
        timeLeft: "Ended",
        quorum: "15,000"
      },
      {
        id: 3,
        title: "Partner with Major Coffee Chain",
        description: "Strategic partnership with 500+ locations",
        status: "Draft",
        votes: { for: 0, against: 0 },
        timeLeft: "Not started",
        quorum: "15,000"
      }
    ],
    votingPower: 2847,
    participationRate: "67%"
  };

  const defiFeatures = [
    {
      name: "Yield Farming",
      apy: "23.4%",
      description: "Provide liquidity to CIRQ/ETH pool",
      tvl: "$2.4M",
      rewards: "CIRQ + LP fees"
    },
    {
      name: "Lending Protocol",
      apy: "8.7%",
      description: "Lend CIRQ tokens to earn interest",
      tvl: "$1.8M",
      rewards: "CIRQ interest"
    },
    {
      name: "NFT Collateral",
      apy: "Variable",
      description: "Borrow against NFT rewards",
      tvl: "$560K",
      rewards: "Flexible loans"
    }
  ];

  const connectWallet = () => {
    setWalletConnected(true);
    // Simulate wallet connection
    setTimeout(() => {
      setUserBalance({ cirq: 2847, nft: 3, eth: 0.45 });
    }, 1000);
  };

  const mintNFT = (nftId: string) => {
    alert(`Minting ${nftId} NFT... Transaction will be sent to your wallet!`);
  };

  const stakeTokens = (amount: number, pool: string) => {
    alert(`Staking ${amount} CIRQ in ${pool}... Confirm in wallet!`);
  };

  return (
    <div className="space-y-6">
      <Card className="card-hover glow-effect">
        <CardHeader>
          <CardTitle className="flex items-center gradient-text">
            <Coins className="mr-2 h-6 w-6" />
            Web3 & Blockchain Hub
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{userBalance.cirq.toLocaleString()}</div>
              <div className="text-sm text-purple-700">CIRQ Tokens</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{userBalance.nft}</div>
              <div className="text-sm text-blue-700">NFT Rewards</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{tokenomics.cirqToken.price}</div>
              <div className="text-sm text-green-700">CIRQ Price</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{tokenomics.staking.apr}</div>
              <div className="text-sm text-orange-700">Staking APR</div>
            </div>
          </div>

          <div className="mt-6 text-center">
            {!walletConnected ? (
              <Button onClick={connectWallet} className="gradient-bg border-0 text-white">
                <Wallet className="mr-2 h-4 w-4" />
                Connect Wallet
              </Button>
            ) : (
              <Badge className="gradient-bg border-0 text-white">
                <Wallet className="mr-1 h-3 w-3" />
                Wallet Connected
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="nfts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="nfts">NFT Rewards</TabsTrigger>
          <TabsTrigger value="tokens">Tokenomics</TabsTrigger>
          <TabsTrigger value="staking">Staking</TabsTrigger>
          <TabsTrigger value="dao">DAO Governance</TabsTrigger>
          <TabsTrigger value="defi">DeFi Features</TabsTrigger>
        </TabsList>

        <TabsContent value="nfts" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            {nftRewards.map((nft) => (
              <Card key={nft.id} className="card-hover">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-6xl mb-2">{nft.image}</div>
                      <h4 className="font-semibold text-gray-900">{nft.name}</h4>
                      <Badge variant="outline" className="mt-1">
                        {nft.rarity}
                      </Badge>
                    </div>

                    <p className="text-sm text-gray-600 text-center">{nft.description}</p>

                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700">Benefits:</div>
                      <ul className="space-y-1">
                        {nft.benefits.map((benefit, idx) => (
                          <li key={idx} className="text-xs text-gray-600 flex items-center">
                            <Star className="h-3 w-3 text-yellow-500 mr-1" />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Holders: {nft.holders}</span>
                      <span className="font-medium text-green-600">{nft.value}</span>
                    </div>

                    <Button 
                      onClick={() => mintNFT(nft.id)}
                      className="w-full gradient-bg border-0 text-white"
                    >
                      <Gift className="mr-2 h-4 w-4" />
                      Mint NFT
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tokens" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="gradient-text">CIRQ Token Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm text-blue-600">Current Price</div>
                    <div className="font-bold text-blue-800">{tokenomics.cirqToken.price}</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-sm text-green-600">Market Cap</div>
                    <div className="font-bold text-green-800">{tokenomics.cirqToken.marketCap}</div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="text-sm text-purple-600">Total Supply</div>
                    <div className="font-bold text-purple-800">{parseInt(tokenomics.cirqToken.totalSupply).toLocaleString()}</div>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <div className="text-sm text-orange-600">Circulating</div>
                    <div className="font-bold text-orange-800">{parseInt(tokenomics.cirqToken.circulating).toLocaleString()}</div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Token Utilities</h4>
                  <ul className="space-y-1">
                    {tokenomics.cirqToken.utilities.map((utility, idx) => (
                      <li key={idx} className="text-sm text-gray-600 flex items-center">
                        <Zap className="h-3 w-3 text-purple-500 mr-2" />
                        {utility}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="gradient-text">Token Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Team & Advisors</span>
                    <span className="font-medium">20%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '20%' }}></div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Community Rewards</span>
                    <span className="font-medium">35%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '35%' }}></div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Ecosystem Development</span>
                    <span className="font-medium">25%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: '25%' }}></div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Public Sale</span>
                    <span className="font-medium">20%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-orange-500 h-2 rounded-full" style={{ width: '20%' }}></div>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
                  <h4 className="font-semibold text-purple-800 mb-2">🚀 Roadmap Highlights</h4>
                  <div className="text-sm text-purple-700 space-y-1">
                    <div>• Q1: DEX listings & staking launch</div>
                    <div>• Q2: NFT marketplace & DAO governance</div>
                    <div>• Q3: Cross-chain bridge & partnerships</div>
                    <div>• Q4: Major CEX listings & global expansion</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="staking" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="gradient-text">Staking Pools</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {tokenomics.staking.stakingPools.map((pool, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-gray-900">{pool.name}</h4>
                      <Badge className="gradient-bg border-0 text-white">
                        {pool.apr} APR
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 mb-3">
                      Total Locked: {pool.locked}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Amount to stake" />
                      <Button 
                        onClick={() => stakeTokens(1000, pool.name)}
                        size="sm" 
                        className="gradient-bg border-0 text-white"
                      >
                        Stake
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="gradient-text">Staking Rewards</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">💰 Earnings Calculator</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-green-700">Your Stake:</span>
                      <span className="font-medium">2,847 CIRQ</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-green-700">Daily Rewards:</span>
                      <span className="font-medium">0.94 CIRQ</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-green-700">Monthly Rewards:</span>
                      <span className="font-medium">28.47 CIRQ</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-green-700">Yearly Rewards:</span>
                      <span className="font-medium">341.64 CIRQ</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="font-bold text-blue-600">{tokenomics.staking.totalStaked}</div>
                    <div className="text-xs text-blue-600">Total Staked</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="font-bold text-purple-600">{tokenomics.staking.rewards}</div>
                    <div className="text-xs text-purple-600">Rewards Paid</div>
                  </div>
                </div>

                <Button className="w-full gradient-bg border-0 text-white">
                  <Coins className="mr-2 h-4 w-4" />
                  Claim Rewards
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="dao" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="gradient-text">Active Proposals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {daoGovernance.proposals.map((proposal) => (
                  <div key={proposal.id} className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-gray-900">{proposal.title}</h4>
                      <Badge variant={proposal.status === "Active" ? "default" : proposal.status === "Passed" ? "secondary" : "outline"}>
                        {proposal.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{proposal.description}</p>
                    
                    {proposal.status === "Active" && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-green-600">For: {proposal.votes.for.toLocaleString()}</span>
                          <span className="text-red-600">Against: {proposal.votes.against.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${(proposal.votes.for / (proposal.votes.for + proposal.votes.against)) * 100}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Time left: {proposal.timeLeft}</span>
                          <span>Quorum: {proposal.quorum}</span>
                        </div>
                        <Button size="sm" className="w-full gradient-bg border-0 text-white">
                          <Users className="mr-1 h-3 w-3" />
                          Vote
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="gradient-text">Governance Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h4 className="font-semibold text-purple-800 mb-2">🗳️ Your Voting Power</h4>
                  <div className="text-2xl font-bold text-purple-600 mb-1">
                    {daoGovernance.votingPower.toLocaleString()}
                  </div>
                  <div className="text-sm text-purple-700">CIRQ tokens</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="font-bold text-blue-600">{daoGovernance.participationRate}</div>
                    <div className="text-xs text-blue-600">Participation Rate</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="font-bold text-green-600">{daoGovernance.proposals.length}</div>
                    <div className="text-xs text-green-600">Active Proposals</div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">🏛️ DAO Benefits</h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    <div>• Shape platform direction</div>
                    <div>• Vote on treasury allocation</div>
                    <div>• Influence partnership decisions</div>
                    <div>• Participate in governance rewards</div>
                  </div>
                </div>

                <Button className="w-full gradient-bg border-0 text-white">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Create Proposal
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="defi" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            {defiFeatures.map((feature, index) => (
              <Card key={index} className="card-hover">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="text-center">
                      <h4 className="font-semibold text-gray-900 mb-1">{feature.name}</h4>
                      <Badge className="gradient-bg border-0 text-white">
                        {feature.apy} APY
                      </Badge>
                    </div>

                    <p className="text-sm text-gray-600 text-center">{feature.description}</p>

                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <div className="text-sm font-medium text-blue-600">TVL</div>
                        <div className="text-xs text-blue-700">{feature.tvl}</div>
                      </div>
                      <div className="p-2 bg-green-50 rounded-lg">
                        <div className="text-sm font-medium text-green-600">Rewards</div>
                        <div className="text-xs text-green-700">{feature.rewards}</div>
                      </div>
                    </div>

                    <Button className="w-full gradient-bg border-0 text-white">
                      <Shield className="mr-2 h-4 w-4" />
                      Enter Protocol
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="gradient-text">DeFi Portfolio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                  <div className="text-lg font-bold text-green-600">$4,234</div>
                  <div className="text-sm text-green-700">Total Value Locked</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">$89.45</div>
                  <div className="text-sm text-blue-700">Daily Earnings</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                  <div className="text-lg font-bold text-purple-600">156%</div>
                  <div className="text-sm text-purple-700">Total ROI</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg">
                  <div className="text-lg font-bold text-orange-600">3</div>
                  <div className="text-sm text-orange-700">Active Positions</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}