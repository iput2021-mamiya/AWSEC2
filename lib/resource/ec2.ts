import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { SubnetAttributes } from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';

interface EC2Settings {
  instaceType: string;
  subnet:string[];
  machinetype: string;
  machineregion: string;
  machineImageurl: string;
  secrity:string;
  userData: string[];
  availabilityZones:string[];
}
interface EC2Group {
  name: string;
  userData_need: boolean;
  settings: EC2Settings[];
  keyName:string;
}
interface EC2 {
  Rolename:string,
  default: {
    settings: EC2Settings[];
  };
  groups: EC2Group[];
}
interface MachineImagemap{[key: string]: string;}
interface Vpc{
  location:string;
}
export class Ec2 extends Construct{
  private vpc: ec2.Vpc;
  private sg: { [name: string]: ec2.SecurityGroup }
  private subid: { [key: string]: SubnetAttributes }
  public instances: { [name: string]: ec2.Instance }; // インスタンスをマップとして管理
  constructor(scope: Construct,id:string, vpc: ec2.Vpc, sg: { [name: string]: ec2.SecurityGroup },subnetId: { [key: string]: SubnetAttributes }){
    super(scope,id);
    this.vpc=vpc;
    this.sg = sg;
    this.subid=subnetId;
    this.instances={};
    const Ec2Config = scope.node.tryGetContext('EC2') as EC2;
    this.createinstancegroups(scope,Ec2Config);
  }
  
  private createinstancegroups(scope:Construct,Ec2Config:EC2):void{
    
    const instaceRole = new iam.Role(this,`${Ec2Config.Rolename}`,{
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      ],
    });
    for(const group of Ec2Config.groups){
      for(const setting of group.settings){
       this.createinstance(scope,group,setting,Ec2Config.default.settings[0],instaceRole); // groupを引数として渡す
      }
    }
  }
  private createinstance(scope:Construct,group: EC2Group,setting:EC2Settings,def:EC2Settings,_instaceRole:iam.Role): { [name: string]: ec2.Instance }{ // groupを受け取る
    const location=scope.node.tryGetContext('Vpc.location') as Vpc
    // Create a key pair to be used with this EC2 Instance
    const key = new ec2.CfnKeyPair(this, `${group.keyName}`, {
      keyName: `${group.keyName}`,
    });
    // Delete the key pair when the stack is deleted
    key.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    // Output the command to get the private key
    new cdk.CfnOutput(this, `GetSSHKeyCommand${group.keyName}`, {
      value: `aws ssm get-parameter --name /ec2/keypair/${key.getAtt('KeyPairId')} --region ${location} --with-decryption --query Parameter.Value --output text`,
    })
    const instaceType = setting.instaceType ?? def.instaceType;
    const machineImageurl = setting.machineImageurl ?? def.machineImageurl;
    const userData = setting.userData ?? def.userData;
    const machineregion =setting.machineregion ?? def.machineregion;
    const _userData = ec2.UserData.forLinux();
    if (group.userData_need === true){
      _userData.addCommands(...userData);
    }
    let _machineImage;
    if (setting.machinetype === "windows") {
      _machineImage = ec2.MachineImage.latestWindows(ec2.WindowsVersion.WINDOWS_SERVER_2022_ENGLISH_FULL_BASE);
    }
    else if(setting.machinetype==="image"){
      let object:MachineImagemap ={};
    object[machineregion]=machineImageurl;
      _machineImage=ec2.MachineImage.genericLinux(object);
    }
    else{
      _machineImage= new ec2.AmazonLinuxImage({
          generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      });
    }
    const matchedSgs = this.sg[setting.secrity];
    const subnets = setting.subnet.map(subnetName => {
      const attributes: SubnetAttributes = {
        ...this.subid[subnetName],
        availabilityZone: setting.availabilityZones[0], // この行を追加
      };
      return ec2.Subnet.fromSubnetAttributes(this, `subnet-${subnetName}`, attributes);
    });
    this.instances[group.name] = new ec2.Instance(this,`${group.name}`,{
      vpc: this.vpc,
      instanceType: new ec2.InstanceType(instaceType),
      machineImage:_machineImage,
      securityGroup:matchedSgs,
      vpcSubnets:{
        subnets: subnets
      }
    });
    return this.instances
  }
  get ec2incetance(): { [name: string]: ec2.Instance } {
    return this.instances;
  }
}