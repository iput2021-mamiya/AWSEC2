import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { SubnetAttributes } from 'aws-cdk-lib/aws-ec2';
import * as targets from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
interface ALBContext{
  subnet:string[];
  security: string;
  http: {
    port: number;
    open: boolean;
  };
  path:string[];
  port:number;
}
export class ALB extends Construct {
  private vpc: ec2.Vpc;
  private sg: { [name: string]: ec2.SecurityGroup }
  public httpListener: elbv2.ApplicationListener | null; // 型を 'ApplicationListener | null' に変更
  public alb: elbv2.ApplicationLoadBalancer;
  private subid: { [key: string]: SubnetAttributes };
  private incetace: { [name: string]: ec2.Instance };

  constructor(scope: Construct,id:string, vpc: ec2.Vpc, sg: { [name: string]: ec2.SecurityGroup },subnetId: { [key: string]: SubnetAttributes },incetace:{ [name: string]: ec2.Instance }) {
    super(scope,id);
    this.vpc = vpc;
    this.sg = sg;
    this.subid=subnetId;
    this.incetace = incetace;  // 追加
    this.httpListener = null; // プロパティをnullで初期化
    const albContext = scope.node.tryGetContext("ALB") as ALBContext;
    this.createAlb(scope,albContext); 
    // コンストラクタ内でcreateAlbメソッドを呼び出す
  }

  public createAlb(scope:Construct,albContext:ALBContext): void {

    // デフォルト値の設定
    let defaultHttpListenerConfig = {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      open: true,
      
    };

    // cdk.jsonから取得した設定でデフォルト値を上書き
    let httpListenerConfig = {
      ...defaultHttpListenerConfig,
      ...albContext.http
    };

    const matchedSgs = this.sg[albContext.security];

    // サブネットの情報を取得
    const subnets = albContext.subnet.map(subnetName => {
      const attributes: SubnetAttributes = {
        ...this.subid[subnetName],
      };
      return ec2.Subnet.fromSubnetAttributes(this, `subnet-${subnetName}`, attributes);
    });

    this.alb = new elbv2.ApplicationLoadBalancer(this, "alb", {
      vpc: this.vpc,
      internetFacing: true,
      securityGroup: matchedSgs,
      vpcSubnets: {
        subnets: subnets
      },
    });
    // HTTP リスナーを作成
    this.httpListener = this.alb.addListener('HttpListener', httpListenerConfig); // this.httpListenerにリスナーを代入
    this.httpListener.addTargets("appplcationtargets",{
      port:albContext.http.port,
  
    })
  let priority = 1;
  for (const [name, instance] of Object.entries(this.incetace)) {
    const target = new targets.InstanceTarget(instance);  // InstanceTargetを作成
    const path = albContext.path[priority - 1];  // contextからパスを取得
    // リスナールールを作成
    this.httpListener?.addTargets(`Rule-${name}`, { // Optional chainingを使用
      conditions: [
        elbv2.ListenerCondition.pathPatterns([`/${path}/*`]) // パスに基づく条件
      ],
      priority,  // ルールの優先度
      targets: [target],  // ターゲットに転送するアクション
      port:albContext.port
    });
    priority++;
    }
  
  }
}
