import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  Calculator, 
  CreditCard, 
  FileText, 
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  Store,
  Handshake,
  BarChart3,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Coins
} from 'lucide-react';

interface PoolCampaign {
  id: string;
  name: string;
  totalPoolValue: number;
  participantCount: number;
  status: 'active' | 'completed' | 'cancelled';
  startDate: string;
  endDate: string;
  settlementMethod: string;
}

interface MerchantParticipant {
  id: string;
  businessName: string;
  agreedContribution: number;
  contributionType: string;
  totalRewardsGiven: number;
  currentBalance: number;
  status: 'active' | 'pending' | 'withdrawn';
}

interface Settlement {
  id: string;
  period: string;
  totalRewards: number;
  averagePerMerchant: number;
  status: 'pending' | 'processing' | 'completed';
  participantCount: number;
}

export default function MultiMerchantPoolsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [pools, setPools] = useState<PoolCampaign[]>([]);
  const [participants, setParticipants] = useState<MerchantParticipant[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);

  // Mock data for demonstration
  useEffect(() => {
    setPools([
      {
        id: '1',
        name: 'Downtown District Holiday Campaign',
        totalPoolValue: 15000,
        participantCount: 8,
        status: 'active',
        startDate: '2024-12-01',
        endDate: '2024-12-31',
        settlementMethod: 'financial_compensation'
      },
      {
        id: '2',
        name: 'Summer Food Festival Pool',
        totalPoolValue: 8500,
        participantCount: 5,
        status: 'completed',
        startDate: '2024-07-01',
        endDate: '2024-07-31',
        settlementMethod: 'mixed'
      }
    ]);

    setParticipants([
      {
        id: '1',
        businessName: 'Maria\'s Italian Bistro',
        agreedContribution: 2000,
        contributionType: 'cash',
        totalRewardsGiven: 1850,
        currentBalance: 150,
        status: 'active'
      },
      {
        id: '2',
        businessName: 'Corner Coffee House',
        agreedContribution: 1500,
        contributionType: 'products',
        totalRewardsGiven: 1650,
        currentBalance: -150,
        status: 'active'
      },
      {
        id: '3',
        businessName: 'Tech Repair Shop',
        agreedContribution: 1000,
        contributionType: 'services',
        totalRewardsGiven: 900,
        currentBalance: 100,
        status: 'active'
      }
    ]);

    setSettlements([
      {
        id: '1',
        period: 'December 2024',
        totalRewards: 12500,
        averagePerMerchant: 1562.50,
        status: 'pending',
        participantCount: 8
      },
      {
        id: '2',
        period: 'November 2024',
        totalRewards: 9800,
        averagePerMerchant: 1225,
        status: 'completed',
        participantCount: 8
      }
    ]);
  }, []);

  const CreatePoolDialog = () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="gradient-bg">
          <Plus className="h-4 w-4 mr-2" />
          Create New Pool
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Multi-Merchant Reward Pool</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="poolName">Pool Name</Label>
              <Input id="poolName" placeholder="e.g., Spring Festival Pool" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalValue">Total Pool Value ($)</Label>
              <Input id="totalValue" type="number" placeholder="10000" />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" placeholder="Describe the campaign and its goals..." />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input id="endDate" type="date" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="settlementMethod">Settlement Method</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="financial_compensation">Financial Compensation</SelectItem>
                  <SelectItem value="product_exchange">Product Exchange</SelectItem>
                  <SelectItem value="service_credits">Service Credits</SelectItem>
                  <SelectItem value="mixed">Mixed Methods</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="settlementSchedule">Settlement Schedule</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select schedule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="campaign_end">End of Campaign</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline">Cancel</Button>
            <Button className="gradient-bg">Create Pool</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold gradient-text mb-2">Multi-Merchant Reward Pools</h1>
          <p className="text-xl text-muted-foreground">
            Fair cost-sharing system for collaborative campaigns and cross-business promotions
          </p>
        </div>
        <CreatePoolDialog />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Pools</p>
                <p className="text-2xl font-bold">3</p>
                <p className="text-xs text-green-600">+1 this month</p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Pool Value</p>
                <p className="text-2xl font-bold">$23,500</p>
                <p className="text-xs text-green-600">+$8,500 this month</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Participating Merchants</p>
                <p className="text-2xl font-bold">13</p>
                <p className="text-xs text-blue-600">5 new this month</p>
              </div>
              <Store className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Settlement Accuracy</p>
                <p className="text-2xl font-bold">99.8%</p>
                <p className="text-xs text-green-600">Perfect settlements</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pools">Active Pools</TabsTrigger>
          <TabsTrigger value="participants">Participants</TabsTrigger>
          <TabsTrigger value="settlements">Settlements</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Handshake className="h-5 w-5 text-blue-500" />
                  How It Works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-600">1</div>
                    <div>
                      <h4 className="font-medium">Create Pool Campaign</h4>
                      <p className="text-sm text-muted-foreground">Set up collaborative campaigns with agreed contribution amounts</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-sm font-semibold text-green-600">2</div>
                    <div>
                      <h4 className="font-medium">Merchants Join & Contribute</h4>
                      <p className="text-sm text-muted-foreground">Businesses agree to contribution amounts (cash, products, services)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-sm font-semibold text-purple-600">3</div>
                    <div>
                      <h4 className="font-medium">Rewards Given & Tracked</h4>
                      <p className="text-sm text-muted-foreground">All rewards automatically tracked with real-time balance updates</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-sm font-semibold text-orange-600">4</div>
                    <div>
                      <h4 className="font-medium">Automatic Settlement</h4>
                      <p className="text-sm text-muted-foreground">Fair compensation based on actual rewards given vs received</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-green-500" />
                  Settlement Methods
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      Financial Compensation
                    </h4>
                    <p className="text-sm text-muted-foreground">Direct money transfers for reward imbalances</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium flex items-center gap-2">
                      <Coins className="h-4 w-4 text-blue-500" />
                      Product Exchange
                    </h4>
                    <p className="text-sm text-muted-foreground">Trade products/services instead of cash payments</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-purple-500" />
                      Platform Credits
                    </h4>
                    <p className="text-sm text-muted-foreground">Credits applied to future campaigns or platform fees</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium flex items-center gap-2">
                      <Target className="h-4 w-4 text-orange-500" />
                      Mixed Methods
                    </h4>
                    <p className="text-sm text-muted-foreground">Flexible combination based on merchant preferences</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pools" className="space-y-6">
          <div className="space-y-4">
            {pools.map((pool) => (
              <Card key={pool.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{pool.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {pool.startDate} - {pool.endDate}
                      </p>
                    </div>
                    <Badge variant={pool.status === 'active' ? 'default' : pool.status === 'completed' ? 'secondary' : 'destructive'}>
                      {pool.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">${pool.totalPoolValue.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Total Pool Value</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{pool.participantCount}</p>
                      <p className="text-sm text-muted-foreground">Participants</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">{pool.settlementMethod.replace('_', ' ')}</p>
                      <p className="text-sm text-muted-foreground">Settlement Method</p>
                    </div>
                    <div className="text-center">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="participants" className="space-y-6">
          <div className="space-y-4">
            {participants.map((participant) => (
              <Card key={participant.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{participant.businessName}</h3>
                      <p className="text-sm text-muted-foreground">
                        Contribution: ${participant.agreedContribution} ({participant.contributionType})
                      </p>
                    </div>
                    <Badge variant={participant.status === 'active' ? 'default' : 'secondary'}>
                      {participant.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-xl font-bold text-red-600">${participant.totalRewardsGiven}</p>
                      <p className="text-sm text-muted-foreground">Rewards Given</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-green-600">${participant.agreedContribution}</p>
                      <p className="text-sm text-muted-foreground">Agreed Contribution</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {participant.currentBalance >= 0 ? (
                          <>
                            <ArrowUpRight className="h-4 w-4 text-green-500" />
                            <p className="text-xl font-bold text-green-600">${Math.abs(participant.currentBalance)}</p>
                          </>
                        ) : (
                          <>
                            <ArrowDownRight className="h-4 w-4 text-red-500" />
                            <p className="text-xl font-bold text-red-600">${Math.abs(participant.currentBalance)}</p>
                          </>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">Balance</p>
                    </div>
                    <div className="text-center">
                      <Button variant="outline" size="sm">
                        View History
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settlements" className="space-y-6">
          <div className="space-y-4">
            {settlements.map((settlement) => (
              <Card key={settlement.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Settlement - {settlement.period}</h3>
                      <p className="text-sm text-muted-foreground">
                        {settlement.participantCount} participating merchants
                      </p>
                    </div>
                    <Badge variant={settlement.status === 'completed' ? 'default' : settlement.status === 'processing' ? 'secondary' : 'outline'}>
                      {settlement.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-xl font-bold text-blue-600">${settlement.totalRewards.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Total Rewards</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-green-600">${settlement.averagePerMerchant}</p>
                      <p className="text-sm text-muted-foreground">Average per Merchant</p>
                    </div>
                    <div className="text-center">
                      <Button variant="outline" size="sm">
                        <Receipt className="h-4 w-4 mr-2" />
                        View Invoice
                      </Button>
                    </div>
                  </div>
                  
                  <Progress value={settlement.status === 'completed' ? 100 : settlement.status === 'processing' ? 60 : 0} className="h-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  Pool Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Average Pool Success Rate</span>
                    <span className="font-semibold">94.5%</span>
                  </div>
                  <Progress value={94.5} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Merchant Satisfaction</span>
                    <span className="font-semibold">4.8/5</span>
                  </div>
                  <Progress value={96} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Settlement Accuracy</span>
                    <span className="font-semibold">99.8%</span>
                  </div>
                  <Progress value={99.8} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Financial Impact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600">Total Savings vs Individual Campaigns</p>
                    <p className="text-2xl font-bold text-green-700">$12,450</p>
                    <p className="text-xs text-green-600">35% cost reduction</p>
                  </div>
                  
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600">Average Settlement Time</p>
                    <p className="text-2xl font-bold text-blue-700">2.1 days</p>
                    <p className="text-xs text-blue-600">Industry avg: 7 days</p>
                  </div>
                  
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="text-sm text-purple-600">Cross-Business Revenue Generated</p>
                    <p className="text-2xl font-bold text-purple-700">$89,300</p>
                    <p className="text-xs text-purple-600">From pool campaigns</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}