/**
 * Test for MioToken
 *
 * @author Validity Labs AG <info@validitylabs.org>
 */

import {expectThrow, getEvents, BigNumber} from '../helpers/tools';
import {logger as log} from '../../../tools/lib/logger';

const MioToken = artifacts.require('./MioToken');
