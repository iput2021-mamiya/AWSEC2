import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

interface VpcContext{
    project:string;
    cidr: string;
    natGateway:number;
    location:string;
    availabilityZones:string[];
}
interface SubnetContext {
    cidr: number;
    public: {
      number: number;
      name: string[];
    };
    private: {
      number: number;
      name: string[];
    };
    Isolated: {
      number: number;
      name: string[];
    };
  }

export class Vpc extends cdk.Stack{
    public vpc: ec2.Vpc;
    public subnetNames: string[] = [];

    //vpc
    public createResources(scope:Construct): ec2.Vpc {
        const vpcContext = scope.node.tryGetContext("Vpc") as VpcContext;
        const vpcName = `${vpcContext.project}-vpc`;
        let az: string[] = [];
        for (let i of vpcContext.availabilityZones) {
            az.push(`${vpcContext.location}${i}`);
        }
        const subnet = this.createsubnet(scope, vpcContext)
        this.vpc = new ec2.Vpc(scope, vpcName, {
            cidr: vpcContext.cidr,
            natGateways: vpcContext.natGateway,
            availabilityZones: az,
            subnetConfiguration: subnet,
        });
        return this.vpc;
    }
    
    //subnet
    private createsubnet (scope: Construct, vpcContext: VpcContext): ec2.SubnetConfiguration[]{
        const subnetContext = scope.node.tryGetContext("Subnet") as SubnetContext;
        let subnetConfigurations: ec2.SubnetConfiguration[] = [];
    
        // public
        subnetConfigurations.push(...this.createSubnetConfiguration(scope, vpcContext, ec2.SubnetType.PUBLIC, subnetContext.public, subnetContext));  ///...は直接要素に対して配列を追加できる
    
        // private
        subnetConfigurations.push(...this.createSubnetConfiguration(scope, vpcContext, ec2.SubnetType.PRIVATE_WITH_EGRESS, subnetContext.private, subnetContext));
    
        // Isolated
        subnetConfigurations.push(...this.createSubnetConfiguration(scope, vpcContext, ec2.SubnetType.PRIVATE_ISOLATED, subnetContext.Isolated, subnetContext));
        return subnetConfigurations;
    }
    

    //subnet細かく内容設定
    private createSubnetConfiguration(scope: Construct, vpcContext: VpcContext, subnetType: ec2.SubnetType, subnetContextType: { number: number; name: string[] }, subnetContext: SubnetContext): ec2.SubnetConfiguration[] {
        let subnetConfigurations: ec2.SubnetConfiguration[] = [];
        if (subnetContextType.number !== 0) {
            for (let name of subnetContextType.name) {
                    let subnetname =`${vpcContext.project}-${name}`
                    this.subnetNames.push(subnetname);
                    subnetConfigurations.push({
                        cidrMask: subnetContext.cidr,
                        name: subnetname,
                        subnetType: subnetType,

                    });
                }
            }
        return subnetConfigurations;
    }

}
