import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Vpc } from './resource/vpc';
import {arraysubnetId} from './resource/subnetId';
import { Sg } from './resource/sg';
import { Ec2 } from './resource/ec2';
import { Rds } from './resource/rds';
import { ALB } from './resource/alb';

export class Ec2CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    //vpc
    const vpc = new Vpc();
    const vpcResource = vpc.createResources(this);
    //subnet振り分け
    const subnetIdspublic = vpc.vpc.publicSubnets.map(subnet => subnet.subnetId);
    const subnetprivate = vpc.vpc.privateSubnets.map(subnet => subnet.subnetId);
    const subnetisolated = vpc.vpc.isolatedSubnets.map(subnet => subnet.subnetId);
    const tablepublic =vpc.vpc.publicSubnets.map(subnet=>subnet.routeTable.routeTableId);
    const tableprivate =vpc.vpc.privateSubnets.map(subnet=>subnet.routeTable.routeTableId);
    const tableisolated =vpc.vpc.isolatedSubnets.map(subnet=>subnet.routeTable.routeTableId);
    const subnetID = arraysubnetId(scope,subnetIdspublic,subnetprivate,subnetisolated,tablepublic,tableprivate,tableisolated);
    // // //sg　
    const securityGroup= new Sg(this, 'SecurityGroup', vpcResource);
    //ec2
    const instance_ec2=new Ec2(this,'EC2',vpcResource,securityGroup.securityGroups,subnetID);
    const targetec2=instance_ec2.ec2incetance
   //rds
    new Rds(this, "Rds", vpcResource, securityGroup.securityGroups, subnetID);
    //alb
    new ALB(this,"ALB", vpcResource, securityGroup.securityGroups,subnetID,targetec2);
  }
}
