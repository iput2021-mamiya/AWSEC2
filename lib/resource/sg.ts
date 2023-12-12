import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

interface Rule {
  protocol: string;
  ip: string;
  port: number;
  direction: string;
}

interface Group {
  name: string;
  allowAllOutbound:boolean;
  rules: Rule[];
}

interface SG {
  default: {
    rules: Rule[];
  };
  groups: Group[];
}

export class Sg extends Construct {
  public securityGroups: { [name: string]: ec2.SecurityGroup } = {};
 
  constructor(scope: Construct, id: string, vpc: ec2.Vpc) {
    super(scope, id);

    // cdk.jsonからセキュリティグループの設定を取得
    const sgConfig = scope.node.tryGetContext('SG') as SG;

    // 各セキュリティグループの設定
    const groups = sgConfig.groups;
    
    // フェーズ1：各セキュリティグループを作成
    for (const group of groups) {
      const sg = new ec2.SecurityGroup(this, group.name, {
        vpc,
        securityGroupName: group.name,
        allowAllOutbound:group.allowAllOutbound,
      });
      this.securityGroups[group.name] = sg;
    }


    // フェーズ2：各セキュリティグループにルールを追加
   // フェーズ2：各セキュリティグループにルールを追加
  for (const group of groups) {
    this.addRulesToSg(this.securityGroups[group.name], group.rules, sgConfig.default.rules[0]);
    }
  }


  private addRulesToSg(sg: ec2.SecurityGroup, rules: Rule[], defaultRule: Rule) {
    for (const rule of rules) {
      this.addRule(sg, rule, defaultRule);
    }
  }
  

  private addRule(sg: ec2.SecurityGroup, rule: Rule, defaultRule: Rule) {
    const protocol = rule.protocol ?? defaultRule.protocol;
    const ip = rule.ip ?? defaultRule.ip;
    const port = rule.port ?? defaultRule.port;
    const direction = rule.direction ?? defaultRule.direction;
  
    let peer;
    switch (protocol) {
      case 'Ipv4':
        peer = ec2.Peer.ipv4(ip);
        break;
      case 'Ipv6':
        peer = ec2.Peer.ipv6(ip);
        break;
      case 'anyIpv4':
        peer = ec2.Peer.anyIpv4();
        break;
      case 'anyIpv6':
        peer = ec2.Peer.anyIpv6();
        break;
      case 'n':
        console.log("protcol setting error")
        break;
      default:
        // セキュリティグループIDを指定した場合
        peer = this.securityGroups[protocol];
    }
    if (peer) {
      if(direction === 'in' && port===0){
        sg.addIngressRule(peer, ec2.Port.allTcp());
      }
      else if(direction === 'out' && port===0){
        sg.addEgressRule(peer, ec2.Port.allTcp());
      }
      else if  (direction === 'in') {
        sg.addIngressRule(peer, ec2.Port.tcp(port));
      } else if (direction === 'out') {
        sg.addEgressRule(peer, ec2.Port.tcp(port));
      }
    }
  } 
}
