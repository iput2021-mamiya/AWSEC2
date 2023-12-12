#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {Ec2CdkStack } from '../lib/awscdk-stack';

const app = new cdk.App();
new Ec2CdkStack(app, 'AwscdkStack', {
});